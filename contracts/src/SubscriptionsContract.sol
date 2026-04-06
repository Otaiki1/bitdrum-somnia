// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Subscription, Tier} from "./Types.sol";

contract SubscriptionsContract is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant PRO_FEE_WBTC = 999_000_000;
    uint256 public constant ELITE_FEE_WBTC = 2_499_000_000;

    IERC20 public immutable wbtc;
    address public signalRevenuePool;

    mapping(address => Subscription) public subscriptions;

    event SignalRevenuePoolUpdated(address indexed signalRevenuePool);
    event Subscribed(address indexed user, Tier tier, uint256 expiresAt, uint256 feePaid);

    constructor(address wbtc_, address signalRevenuePool_, address owner_) Ownable(owner_) {
        require(wbtc_ != address(0) && signalRevenuePool_ != address(0), "zero address");
        wbtc = IERC20(wbtc_);
        signalRevenuePool = signalRevenuePool_;
    }

    function setSignalRevenuePool(address signalRevenuePool_) external onlyOwner {
        require(signalRevenuePool_ != address(0), "zero pool");
        signalRevenuePool = signalRevenuePool_;
        emit SignalRevenuePoolUpdated(signalRevenuePool_);
    }

    function subscribe(Tier tier) external {
        require(tier == Tier.PRO || tier == Tier.ELITE, "invalid tier");

        uint256 fee = currentFee(tier);
        wbtc.safeTransferFrom(msg.sender, signalRevenuePool, fee);

        subscriptions[msg.sender] = Subscription({
            tier: tier,
            expiresAt: block.timestamp + 30 days
        });

        emit Subscribed(msg.sender, tier, block.timestamp + 30 days, fee);
    }

    function isActive(address user, Tier tier) external view returns (bool) {
        Subscription memory subscription = subscriptions[user];
        return subscription.tier >= tier && subscription.expiresAt > block.timestamp;
    }

    function currentFee(Tier tier) public pure returns (uint256) {
        if (tier == Tier.PRO) {
            return PRO_FEE_WBTC;
        }
        if (tier == Tier.ELITE) {
            return ELITE_FEE_WBTC;
        }
        revert("invalid tier");
    }
}
