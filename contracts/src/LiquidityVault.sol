// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Direction} from "./Types.sol";
import {ILiquidityVault} from "./interfaces/ILiquidityVault.sol";

contract LiquidityVault is Ownable, ILiquidityVault {
    address public predictionMarket;

    mapping(uint256 => uint256) public committedByMarket;

    event PredictionMarketUpdated(address indexed predictionMarket);
    event MarketFunded(uint256 indexed marketId, Direction direction, uint256 amount, address recipient);
    event WinnerPaid(address indexed recipient, uint256 principal, uint256 profit);

    error Unauthorized();
    error TransferFailed();

    constructor(address owner_) Ownable(owner_) {}

    receive() external payable {}

    modifier onlyPredictionMarket() {
        if (msg.sender != predictionMarket) {
            revert Unauthorized();
        }
        _;
    }

    function setPredictionMarket(address predictionMarket_) external onlyOwner {
        require(predictionMarket_ != address(0), "zero market");
        predictionMarket = predictionMarket_;
        emit PredictionMarketUpdated(predictionMarket_);
    }

    function deposit() external payable onlyOwner {}

    function fundMarket(uint256 marketId, Direction direction, uint256 amount, address recipient)
        external
        onlyPredictionMarket
    {
        committedByMarket[marketId] += amount;
        _nativeTransfer(recipient, amount);
        emit MarketFunded(marketId, direction, amount, recipient);
    }

    function payWinner(address recipient, uint256 principal, uint256 profit) external onlyPredictionMarket {
        _nativeTransfer(recipient, principal + profit);
        emit WinnerPaid(recipient, principal, profit);
    }

    function availableLiquidity() external view returns (uint256) {
        return address(this).balance;
    }

    function _nativeTransfer(address to, uint256 amount) internal {
        (bool ok,) = payable(to).call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
