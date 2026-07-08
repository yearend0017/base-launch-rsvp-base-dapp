// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract BaseLaunchRsvp {
    string public constant EVENT_NAME = "Base Launch Night";
    string public constant VENUE = "Base Hall";
    string public constant EVENT_DATE = "Jun 20, 2026";
    uint256 public constant CAPACITY = 120;

    uint256 public reservedCount;
    mapping(address => bool) private attendees;

    event SeatReserved(address indexed account, uint256 reservedCount);

    function rsvp() external {
        require(!attendees[msg.sender], "Already reserved");
        require(reservedCount < CAPACITY, "Event full");

        attendees[msg.sender] = true;
        reservedCount += 1;

        emit SeatReserved(msg.sender, reservedCount);
    }

    function hasRsvped(address account) external view returns (bool) {
        return attendees[account];
    }

    function getEventSummary()
        external
        view
        returns (
            string memory eventName,
            string memory venue,
            string memory eventDate,
            uint256 capacity,
            uint256 reserved
        )
    {
        return (EVENT_NAME, VENUE, EVENT_DATE, CAPACITY, reservedCount);
    }
}
