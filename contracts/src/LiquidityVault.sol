// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Direction} from "./Types.sol";
import {ILiquidityVault} from "./interfaces/ILiquidityVault.sol";

contract LiquidityVault is Ownable, ILiquidityVault {
    using SafeERC20 for IERC20;

    IERC20 public immutable wbtc;
    address public predictionMarket;

    mapping(uint256 => uint256) public committedByMarket;

    event PredictionMarketUpdated(address indexed predictionMarket);
    event MarketFunded(uint256 indexed marketId, Direction direction, uint256 amount, address recipient);
    event WinnerPaid(address indexed recipient, uint256 principal, uint256 profit);

    error Unauthorized();

    constructor(address wbtc_, address owner_) Ownable(owner_) {
        require(wbtc_ != address(0), "zero token");
        wbtc = IERC20(wbtc_);
    }

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

    function deposit(uint256 amount) external onlyOwner {
        wbtc.safeTransferFrom(msg.sender, address(this), amount);
    }

    function fundMarket(uint256 marketId, Direction direction, uint256 amount, address recipient)
        external
        onlyPredictionMarket
    {
        committedByMarket[marketId] += amount;
        wbtc.safeTransfer(recipient, amount);
        emit MarketFunded(marketId, direction, amount, recipient);
    }

    function payWinner(address recipient, uint256 principal, uint256 profit) external onlyPredictionMarket {
        wbtc.safeTransfer(recipient, principal + profit);
        emit WinnerPaid(recipient, principal, profit);
    }

    function availableLiquidity() external view returns (uint256) {
        return wbtc.balanceOf(address(this));
    }
}
