// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title WrappedSTT
 * @notice ERC-20 wrapper for Somnia's native STT token, following the
 *         canonical WETH9 pattern. Send STT to receive WSTT 1:1;
 *         call withdraw() to redeem WSTT back to STT.
 *
 *         This contract is the staking token for BitDrum on Somnia.
 *         Users never need to bridge or acquire a foreign asset — they
 *         wrap the STT they already hold from the faucet or trading.
 */
contract WrappedSTT {
    string public constant name     = "Wrapped STT";
    string public constant symbol   = "WSTT";
    uint8  public constant decimals = 18;

    event Deposit(address indexed dst, uint256 wad);
    event Withdrawal(address indexed src, uint256 wad);
    event Transfer(address indexed src, address indexed dst, uint256 wad);
    event Approval(address indexed src, address indexed guy, uint256 wad);

    mapping(address => uint256)                     public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// @notice Wrap STT by sending it directly to this contract.
    receive() external payable {
        deposit();
    }

    /// @notice Wrap STT: deposit msg.value STT and mint the same amount of WSTT.
    function deposit() public payable {
        balanceOf[msg.sender] += msg.value;
        emit Deposit(msg.sender, msg.value);
    }

    /// @notice Unwrap WSTT: burn `wad` WSTT and return the same amount of STT.
    function withdraw(uint256 wad) public {
        require(balanceOf[msg.sender] >= wad, "WSTT: insufficient balance");
        balanceOf[msg.sender] -= wad;
        (bool ok, ) = payable(msg.sender).call{value: wad}("");
        require(ok, "WSTT: STT transfer failed");
        emit Withdrawal(msg.sender, wad);
    }

    function totalSupply() public view returns (uint256) {
        return address(this).balance;
    }

    function approve(address guy, uint256 wad) public returns (bool) {
        allowance[msg.sender][guy] = wad;
        emit Approval(msg.sender, guy, wad);
        return true;
    }

    function transfer(address dst, uint256 wad) public returns (bool) {
        return transferFrom(msg.sender, dst, wad);
    }

    function transferFrom(address src, address dst, uint256 wad) public returns (bool) {
        require(balanceOf[src] >= wad, "WSTT: insufficient balance");

        if (src != msg.sender && allowance[src][msg.sender] != type(uint256).max) {
            require(allowance[src][msg.sender] >= wad, "WSTT: insufficient allowance");
            allowance[src][msg.sender] -= wad;
        }

        balanceOf[src] -= wad;
        balanceOf[dst] += wad;

        emit Transfer(src, dst, wad);
        return true;
    }
}
