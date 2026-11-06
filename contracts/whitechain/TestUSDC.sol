// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Test USD Coin — a 6-decimal test stablecoin for Whitechain testnet
/// @notice Open mint for testing/demo. Not a real asset.
/// @dev Deployed on Whitechain Testnet (chain 1874) at
///      0x1d9F8351F788278D3E181908cEE14c7F5766157F — source-verified on Blockscout.
///      Used as the governed asset for the Chainwall (defense) treasury vault.
contract TestUSDC {
    string public constant name = "Test USD Coin";
    string public constant symbol = "USDC";
    uint8  public constant decimals = 6;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 a = allowance[from][msg.sender];
        require(a >= value, "allowance");
        if (a != type(uint256).max) allowance[from][msg.sender] = a - value;
        _transfer(from, to, value);
        return true;
    }

    /// @notice Open mint — anyone can mint test tokens.
    function mint(address to, uint256 value) external {
        balanceOf[to] += value;
        totalSupply += value;
        emit Transfer(address(0), to, value);
    }

    function _transfer(address from, address to, uint256 value) internal {
        require(balanceOf[from] >= value, "balance");
        require(to != address(0), "to=0");
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
