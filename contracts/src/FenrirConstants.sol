// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// ─── Gobernanza ──────────────────────────────────────────────────────────────

uint256 constant VOTING_PERIOD            = 10 minutes;
uint256 constant QUORUM_BPS               = 5100;   // 51 %
uint256 constant APPROVAL_THRESHOLD_BPS   = 5100;   // 51 %
uint256 constant DEVELOPER_SALE_VOTE_WEIGHT = 1 ether;

// ─── Proyecto ────────────────────────────────────────────────────────────────

uint256 constant COMMISSION_BPS           = 1000;   // 10 %
uint256 constant MAX_RETRIES_PER_MILESTONE = 2;
uint256 constant RETRY_WINDOW             = 1 days;

// ─── Compartida ──────────────────────────────────────────────────────────────

uint256 constant BPS_DENOMINATOR          = 10000;
