<div align="center">
    <img width="300" alt="Icons made by Eucalyp from www.flaticon.com" src="rocking.svg">
    <h1>HQ20 contracts</h1>
    <div>
        <a
            href="https://app.netlify.com/sites/hq20-contracts/deploys"><img
                src="https://api.netlify.com/api/v1/badges/13cb75c8-7d47-4cb9-808d-1657b46091c4/deploy-status" /></a>&emsp;
        <a
            href="https://travis-ci.com/HQ20/contracts"><img
                src="https://travis-ci.com/HQ20/contracts.svg?branch=dev" /></a>&emsp;
        <a
            href="https://coveralls.io/github/HQ20/contracts?branch=dev"><img
                src="https://coveralls.io/repos/github/HQ20/contracts/badge.svg?branch=dev" /></a>&emsp;
        <a
            href="https://dependabot.com"><img
                src="https://api.dependabot.com/badges/status?host=github&repo=HQ20/contracts" /></a>&emsp;
    </div>
</div>

> HQ20/contracts is an Solidity project with contracts, libraries and examples to help you build fully-featured distributed applications for the real world.

## Installation

Use the package manager [yarn](https://yarnpkg.com) to install dependencies.

```bash
$ yarn
```

## Usage

```solidity
pragma solidity ^0.5.10;
import "@hq20/contracts/contracts/access/RBAC.sol"


contract MyContract is RBAC {
	constructor() public RBAC(msg.sender) {
		// do something
	}
}
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[Apache-2.0](LICENSE)
