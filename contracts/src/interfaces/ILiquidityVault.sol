// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Direction} from "../Types.sol";

interface ILiquidityVault {
    function fundMarket(uint256 marketId, Direction direction, uint256 amount, address recipient) external;
    function payWinner(address recipient, uint256 principal, uint256 profit) external;
}
