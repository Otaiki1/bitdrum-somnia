// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract Treasury is Ownable {
    using SafeERC20 for IERC20;

    uint256 public constant VAULT_BPS = 4000;
    uint256 public constant AI_BPS = 3500;
    uint256 public constant RESERVE_BPS = 2500;

    IERC20 public immutable wbtc;
    address public vaultRecipient;
    address public aiFundRecipient;
    address public reserveRecipient;

    event AllocationRecipientsUpdated(address vaultRecipient, address aiFundRecipient, address reserveRecipient);
    event FundsDistributed(uint256 vaultAmount, uint256 aiAmount, uint256 reserveAmount);

    constructor(
        address wbtc_,
        address vaultRecipient_,
        address aiFundRecipient_,
        address reserveRecipient_,
        address owner_
    ) Ownable(owner_) {
        require(
            wbtc_ != address(0)
                && vaultRecipient_ != address(0)
                && aiFundRecipient_ != address(0)
                && reserveRecipient_ != address(0),
            "zero address"
        );

        wbtc = IERC20(wbtc_);
        vaultRecipient = vaultRecipient_;
        aiFundRecipient = aiFundRecipient_;
        reserveRecipient = reserveRecipient_;
    }

    function setRecipients(address vaultRecipient_, address aiFundRecipient_, address reserveRecipient_) external onlyOwner {
        require(
            vaultRecipient_ != address(0) && aiFundRecipient_ != address(0) && reserveRecipient_ != address(0),
            "zero recipient"
        );

        vaultRecipient = vaultRecipient_;
        aiFundRecipient = aiFundRecipient_;
        reserveRecipient = reserveRecipient_;

        emit AllocationRecipientsUpdated(vaultRecipient_, aiFundRecipient_, reserveRecipient_);
    }

    function distribute() external {
        uint256 balance = wbtc.balanceOf(address(this));
        require(balance > 0, "no treasury balance");

        uint256 vaultAmount = (balance * VAULT_BPS) / 10_000;
        uint256 aiAmount = (balance * AI_BPS) / 10_000;
        uint256 reserveAmount = balance - vaultAmount - aiAmount;

        wbtc.safeTransfer(vaultRecipient, vaultAmount);
        wbtc.safeTransfer(aiFundRecipient, aiAmount);
        wbtc.safeTransfer(reserveRecipient, reserveAmount);

        emit FundsDistributed(vaultAmount, aiAmount, reserveAmount);
    }
}
