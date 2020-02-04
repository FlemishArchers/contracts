// tslint:disable:no-var-requires
import * as chai from 'chai';
const { balance, BN, ether, expectEvent, expectRevert } = require('@openzeppelin/test-helpers');
const { advanceTimeAndBlock, takeSnapshot, revertToSnapshot } = require('ganache-time-traveler');

import { IssuanceAdvancedInstance, TestERC20MintableInstance } from '../../../types/truffle-contracts';

const IssuanceAdvanced = artifacts.require(
    './drafts/issuance/IssuanceAdvanced.sol',
    ) as Truffle.Contract<IssuanceAdvancedInstance>;
const TestERC20Mintable = artifacts.require(
        './test/issuance/TestERC20Mintable.sol',
    ) as Truffle.Contract<TestERC20MintableInstance>;

chai.use(require('chai-bn')(require('bn.js')));
chai.should();
// tslint:enable:no-var-requires


contract('IssuanceAdvanced', (accounts) => {
    let snapshotId: any;

    const investor1 = accounts[1];
    const investor2 = accounts[2];
    const wallet = accounts[3];

    let issuance: IssuanceAdvancedInstance;
    let currencyToken: TestERC20MintableInstance;
    let issuanceToken: TestERC20MintableInstance;

    beforeEach(async () => {
        const snapShot = await takeSnapshot();
        snapshotId = snapShot.result;
        currencyToken = await TestERC20Mintable.new();
        issuanceToken = await TestERC20Mintable.new();
        issuance = await IssuanceAdvanced.new(
            issuanceToken.address,
            currencyToken.address,
        );
        await issuanceToken.addMinter(issuance.address);
        await issuance.setOpeningDate(Math.floor((new Date()).getTime() / 1000) - 3600);
        await issuance.setClosingDate(Math.floor((new Date()).getTime() / 1000) + 3600);
        await issuance.setSoftCap(ether('50'));
        await issuance.setMinInvestment(ether('10'));
    });

    afterEach(async  () => {
        await revertToSnapshot(snapshotId);
    });

    /**
     * @test {IssuanceAdvanced#openIssuance}
     */
    it('openIssuance can succefully open the Issuance', async () => {
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        bytes32ToString(await issuance.currentState()).should.be.equal('OPEN');
    });

    /**
     * @test {IssuanceAdvanced#openIssuance}
     */
    it('cannot open issuance outside allotted timeframe', async () => {
        await issuance.setIssuePrice(5);
        await advanceTimeAndBlock(4000);
        await expectRevert(
            issuance.openIssuance(),
            'Not the right time.',
        );
    });

    /**
     * @test {IssuanceAdvanced#invest}
     */
    it('invest should succesfully invest', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        expectEvent(
            await issuance.invest(ether('50'), { from: investor1 }),
            'InvestmentAdded',
            {
                investor: investor1,
                amount: ether('50'),
            },
        );
    });

    /**
     * @test {IssuanceAdvanced#invest}
     */
    it('cannot invest if state is not "OPEN"', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await expectRevert(
            issuance.invest(ether('50'), { from: investor1 }),
            'Not open for investments.',
        );
    });

    /**
     * @test {IssuanceAdvanced#invest}
     */
    it('cannot invest outisde allotted timespan', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await advanceTimeAndBlock(4000);
        await expectRevert(
            issuance.invest(ether('50'), { from: investor1 }),
            'Not the right time.',
        );
    });

    /**
     * @test {IssuanceAdvanced#invest}
     */
    it('cannot invest with fractional investments', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await expectRevert(
            issuance.invest(new BN('1000000000000000001'), { from: investor1 }),
            'Fractional investments not allowed.',
        );
    });

    /**
     * @test {IssuanceAdvanced#invest}
     */
    it('cannot invest with investment below minimum threshold', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await expectRevert(
            issuance.invest(ether('5'), { from: investor1 }),
            'Investment below minimum threshold.',
        );
    });

    /**
     * @test {IssuanceAdvanced#startDistribution}
     */
    it('startDistribution can succesfully close the Issuance', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await advanceTimeAndBlock(4000);
        await issuance.startDistribution();
        bytes32ToString(await issuance.currentState()).should.be.equal('LIVE');
    });

    /**
     * @test {IssuanceAdvanced#startDistribution}
     */
    it('cannot start distribution before closing time', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await expectRevert(
            issuance.startDistribution(),
            'Not the right time yet.',
        );
    });

    /**
     * @test {IssuanceAdvanced#startDistribution}
     */
    it('cannot start distribution when soft cap not reached', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('10'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await advanceTimeAndBlock(4000);
        await expectRevert(
            issuance.startDistribution(),
            'Not enough funds collected.',
        );
    });

    /**
     * @test {IssuanceAdvanced#claim}
     */
    it('claim sends tokens to investors', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await advanceTimeAndBlock(4000);
        await issuance.startDistribution();
        bytes32ToString(await issuance.currentState()).should.be.equal('LIVE');
        await issuance.claim({ from: investor1 });
        await issuance.claim({ from: investor2 });
        web3.utils.fromWei(await issuanceToken.balanceOf(investor1), 'ether').should.be.equal('10');
        web3.utils.fromWei(await issuanceToken.balanceOf(investor2), 'ether').should.be.equal('2');
    });

    /**
     * @test {IssuanceAdvanced#claim}
     */
    it('claim sends tokens to investors, with negative issue price', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(-5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await advanceTimeAndBlock(4000);
        await issuance.startDistribution();
        bytes32ToString(await issuance.currentState()).should.be.equal('LIVE');
        await issuance.claim({ from: investor1 });
        await issuance.claim({ from: investor2 });
        web3.utils.fromWei(await issuanceToken.balanceOf(investor1), 'ether').should.be.equal('250');
        web3.utils.fromWei(await issuanceToken.balanceOf(investor2), 'ether').should.be.equal('50');
    });

    /**
     * @test {IssuanceAdvanced#claim}
     */
    it('cannot claim when state is not "LIVE"', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await advanceTimeAndBlock(4000);
        await expectRevert(
            issuance.claim({ from: investor1 }),
            'Cannot claim now.',
        );
    });

    /**
     * @test {IssuanceAdvanced#claim}
     */
    it('cannot claim when not invested', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await advanceTimeAndBlock(4000);
        await issuance.startDistribution();
        await expectRevert(
            issuance.claim({ from: investor2 }),
            'No investments found.',
        );
    });

    /**
     * @test {IssuanceAdvanced#cancelInvestment}
     */
    it('cancelInvestment should cancel an investor investments', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('60'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor1 });
        expectEvent(
            await issuance.cancelInvestment({ from: investor1 }),
            'InvestmentCancelled',
            {
                investor: investor1,
                amount: ether('60'),
            },
        );
    });

    /**
     * @test {IssuanceAdvanced#cancelInvestment}
     */
    it('cannot cancel investment when state is not "OPEN" or "FAILED"', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('60'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor1 });
        await advanceTimeAndBlock(4000);
        await issuance.startDistribution();
        await expectRevert(
            issuance.cancelInvestment({ from: investor1 }),
            'Cannot cancel now.',
        );
    });

    /**
     * @test {IssuanceAdvanced#cancelInvestment}
     */
    it('cannot cancel investment when not invested', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.approve(issuance.address, ether('60'), { from: investor1 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await expectRevert(
            issuance.cancelInvestment({ from: investor1 }),
            'No investments found.',
        );
    });

    /**
     * @test {IssuanceAdvanced#cancelAllInvestments}
     */
    it('cancelAllInvestments should begin the process to cancel all investor investments', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await issuance.cancelAllInvestments();
        bytes32ToString(await issuance.currentState()).should.be.equal('FAILED');
        await issuance.cancelInvestment({ from: investor1 });
        await issuance.cancelInvestment({ from: investor2 });
        web3.utils.fromWei(await currencyToken.balanceOf(investor1), 'ether').should.be.equal('100');
        web3.utils.fromWei(await currencyToken.balanceOf(investor2), 'ether').should.be.equal('50');
    });

    /**
     * @test {IssuanceAdvanced#withdraw}
     */
    it('withdraw should transfer all collected tokens to the wallet of the owner', async () => {
        await currencyToken.mint(investor1, ether('100'));
        await currencyToken.mint(investor2, ether('50'));
        await currencyToken.approve(issuance.address, ether('50'), { from: investor1 });
        await currencyToken.approve(issuance.address, ether('10'), { from: investor2 });
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await issuance.invest(ether('50'), { from: investor1 });
        await issuance.invest(ether('10'), { from: investor2 });
        await advanceTimeAndBlock(4000);
        await issuance.startDistribution();
        await issuance.claim({ from: investor1 });
        await issuance.claim({ from: investor2 });
        await issuance.withdraw(wallet);
        web3.utils.fromWei(await currencyToken.balanceOf(wallet), 'ether').should.be.equal('60');
    });

    /**
     * @test {IssuanceAdvanced#withdraw}
     */
    it('cannot transfer funds when issuance state is not "LIVE"', async () => {
        await issuance.setIssuePrice(5);
        await issuance.openIssuance();
        await expectRevert(
            issuance.withdraw(wallet),
            'Cannot transfer funds now.',
        );
    });

    it('setIssuePrice sets the issue price', async () => {
        await issuance.setIssuePrice(5);
        (await issuance.issuePrice()).toString().should.be.equal('5');
    });

    it('setIssuePrice cannot set the issue price to be zero', async () => {
        await expectRevert(
            issuance.setIssuePrice(0),
            'Cannot set issuePrice to be zero.',
        );
    });

    it('setOpeningDate sets the opening date', async () => {
        const openingDate = Math.floor((new Date()).getTime() / 1000);
        await issuance.setOpeningDate(openingDate);
        (await issuance.openingDate()).toString().should.be.equal(openingDate.toString());
    });

    it('setClosingDate sets the closing date', async () => {
        const closingDate = Math.floor((new Date()).getTime() / 1000);
        await issuance.setClosingDate(closingDate);
        (await issuance.closingDate()).toString().should.be.equal(closingDate.toString());
    });

    it('setSoftCap sets the soft cap', async () => {
        await issuance.setSoftCap(ether('100'));
        web3.utils.fromWei(await issuance.softCap(), 'ether').should.be.equal('100');
    });

    it('setMinInvestment sets the minimum investment', async () => {
        await issuance.setMinInvestment(ether('1'));
        web3.utils.fromWei(await issuance.minInvestment(), 'ether').should.be.equal('1');
    });

});

function bytes32ToString(text: string) {
    return web3.utils.toAscii(text).replace(/\0/g, '');
}
