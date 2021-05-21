pragma solidity 0.8.4;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Link is ERC20 {

    constructor() ERC20("Chainlink", "LINK") public {
        _mint(msg.sender, 1000);
    }


}