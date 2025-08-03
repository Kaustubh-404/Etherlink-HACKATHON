// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract BattleArena is Ownable, ReentrancyGuard, Pausable {
    
    // Events
    event CharacterAcquired(address indexed owner, uint256 indexed characterInstanceId, uint256 characterTypeId);
    event CharacterLeveledUp(uint256 indexed characterInstanceId, uint256 newLevel);
    event MatchInitiated(uint256 indexed matchId, address indexed initiator, uint256 stake);
    event MatchJoined(uint256 indexed matchId, address indexed opponent);
    event MatchCompleted(uint256 indexed matchId, address indexed winner, uint256 reward);
    event MoveMade(uint256 indexed matchId, address indexed player, uint256 abilityIndex, uint256 damage);
    
    // Structs
    struct Ability {
        string name;
        uint256 baseDamage;
        uint256 manaCost;
        uint256 cooldown; // in turns
    }
    
    struct CharacterType {
        string name;
        string description;
        uint256 baseHealth;
        uint256 baseMana;
        uint256 baseDefense;
        Ability[4] abilities; // max 4
        bool exists;
    }
    
    struct CharacterInstance {
        uint256 characterTypeId;
        uint256 level;
        uint256 experience;
        address owner;
        bool exists;
    }
    
    struct CharacterInMatch {
        uint256 characterInstanceId;
        uint256 currentHealth;
        uint256 currentMana;
        uint256[] abilityCooldowns;
    }
    
    struct Match {
        uint256 matchId;
        address player1;
        address player2;
        CharacterInMatch character1;
        CharacterInMatch character2;
        uint256 stake;
        address currentTurn;
        address winner;
        MatchStatus status;
        uint256 turnCount;
        uint256 createdAt;
        uint256 lastMoveTimestamp;
    }
    
    struct PlayerProfile {
        address playerAddress;
        uint256[] ownedCharacterInstances;
        uint256 totalMatches;
        uint256 wins;
        uint256 losses;
    }
    
    enum MatchStatus {
        FINDING,
        ONGOING,
        COMPLETED
    }
    
    // State variables
    mapping(uint256 => CharacterType) public characterTypes;
    mapping(uint256 => CharacterInstance) public characterInstances;
    mapping(address => PlayerProfile) public playerProfiles;
    mapping(uint256 => Match) private matches;
    mapping(uint256 => uint256[]) public findingMatches; // stake => matchIds[]
    
    uint256 public nextCharacterInstanceId = 1;
    uint256 public nextMatchId = 1;
    uint256 public platformFeePercentage = 250; // 2.5% (basis points)
    uint256 public constant MAX_LEVEL = 100;
    uint256 public constant ABILITIES_PER_CHARACTER = 4;
    uint256 public constant MAX_TURN_TIME = 24 hours;
    uint256 public constant TURN_TIMEOUT = 30 minutes;
    uint256 public constant MANA_REGEN_PER_TURN = 15;
    uint256 public constant TOTAL_CHARACTER_TYPES = 4;

    constructor() Ownable(msg.sender) {
        _initializeCharacterTypes();
    }
    
    function _initializeCharacterTypes() internal {
        characterTypes[1].name = "Zeus";
        characterTypes[1].description = "Zeus, the ruler of Mount Olympus and god of the sky and thunder, wields devastating lightning bolts and commands storms with divine authority.";
        characterTypes[1].baseHealth = 100;
        characterTypes[1].baseMana = 120;
        characterTypes[1].baseDefense = 30;
        characterTypes[1].exists = true;
        
        characterTypes[1].abilities[0] = Ability("Lightning Bolt", 40, 18, 2);
        characterTypes[1].abilities[1] = Ability("Thunderstorm", 55, 30, 4);
        characterTypes[1].abilities[2] = Ability("Heaven's Wrath", 70, 35, 5);
        characterTypes[1].abilities[3] = Ability("Divine Restoration", 35, 25, 3);
        
        characterTypes[2].name = "Athena";
        characterTypes[2].description = "Athena, goddess of strategic warfare and wisdom, stands fearless in battle with her spear and Aegis shield, defending justice and honor.";
        characterTypes[2].baseHealth = 90;
        characterTypes[2].baseMana = 100;
        characterTypes[2].baseDefense = 50;
        characterTypes[2].exists = true;
        
        characterTypes[2].abilities[0] = Ability("Spear Thrust", 35, 12, 1);
        characterTypes[2].abilities[1] = Ability("Aegis Shield", 30, 24, 3);
        characterTypes[2].abilities[2] = Ability("Judgment Strike", 45, 20, 2);
        characterTypes[2].abilities[3] = Ability("Wisdom's Blessing", 25, 18, 2);
        
        characterTypes[3].name = "Hades";
        characterTypes[3].description = "Hades, lord of the underworld, controls the realm of the dead with fiery magic and an iron will. His presence brings dread and doom.";
        characterTypes[3].baseHealth = 110;
        characterTypes[3].baseMana = 90;
        characterTypes[3].baseDefense = 40;
        characterTypes[3].exists = true;
        
        characterTypes[3].abilities[0] = Ability("Soulfire", 45, 20, 3);
        characterTypes[3].abilities[1] = Ability("Underworld Grasp", 60, 28, 5);
        characterTypes[3].abilities[2] = Ability("Hellfire Surge", 50, 22, 4);
        characterTypes[3].abilities[3] = Ability("Soul Drain", 40, 20, 3);
        
        characterTypes[4].name = "Nyx";
        characterTypes[4].description = "Nyx, the primordial goddess of night, manipulates shadows and illusions. She dances between light and darkness, unleashing arcane energy.";
        characterTypes[4].baseHealth = 85;
        characterTypes[4].baseMana = 130;
        characterTypes[4].baseDefense = 35;
        characterTypes[4].exists = true;
        
        characterTypes[4].abilities[0] = Ability("Shadowbind", 30, 15, 2);
        characterTypes[4].abilities[1] = Ability("Eclipse Nova", 50, 35, 4);
        characterTypes[4].abilities[2] = Ability("Veil of Night", 20, 8, 1);
        characterTypes[4].abilities[3] = Ability("Night's Embrace", 28, 20, 3);
    }
    
    // Modifiers
    modifier onlyCharacterInstanceOwner(uint256 _characterInstanceId) {
        require(characterInstances[_characterInstanceId].owner == msg.sender, "Not character instance owner");
        _;
    }
    
    modifier matchExists(uint256 _matchId) {
        require(_matchId < nextMatchId && _matchId > 0, "Match does not exist");
        _;
    }
    
    modifier playerInMatch(uint256 _matchId) {
        Match storage gameMatch = matches[_matchId];
        require(
            gameMatch.player1 == msg.sender || gameMatch.player2 == msg.sender,
            "Not a player in this match"
        );
        _;
    }
    
    modifier isPlayerTurn(uint256 _matchId) {
        require(matches[_matchId].currentTurn == msg.sender, "Not your turn");
        _;
    }
    
    modifier validCharacterType(uint256 _characterTypeId) {
        require(_characterTypeId > 0 && _characterTypeId <= TOTAL_CHARACTER_TYPES, "Invalid character type");
        require(characterTypes[_characterTypeId].exists, "Character type does not exist");
        _;
    }
    
    // Character Management
    function acquireCharacter(uint256 _characterTypeId) 
        external 
        payable 
        whenNotPaused 
        validCharacterType(_characterTypeId) 
    {
        require(msg.value == 0, "Characters are currently free");
        
        uint256 characterInstanceId = nextCharacterInstanceId++;
        
        characterInstances[characterInstanceId] = CharacterInstance({
            characterTypeId: _characterTypeId,
            level: 1,
            experience: 0,
            owner: msg.sender,
            exists: true
        });
        
        playerProfiles[msg.sender].ownedCharacterInstances.push(characterInstanceId);
        
        emit CharacterAcquired(msg.sender, characterInstanceId, _characterTypeId);
    }
    
    function levelUpCharacter(uint256 _characterInstanceId) 
        external 
        onlyCharacterInstanceOwner(_characterInstanceId) 
    {
        CharacterInstance storage characterInstance = characterInstances[_characterInstanceId];
        require(characterInstance.level < MAX_LEVEL, "Character at max level");
        
        uint256 requiredExp = characterInstance.level * 100;
        require(characterInstance.experience >= requiredExp, "Not enough experience");
        
        characterInstance.level++;
        characterInstance.experience -= requiredExp;
        
        emit CharacterLeveledUp(_characterInstanceId, characterInstance.level);
    }
    
    // Match Making
    function initiateMatch(uint256 _characterInstanceId) 
        external 
        payable 
        whenNotPaused 
        onlyCharacterInstanceOwner(_characterInstanceId) 
    {
        require(msg.value > 0, "Stake must be greater than 0");
        require(characterInstances[_characterInstanceId].exists, "Character instance does not exist");
        
        uint256 matchId = nextMatchId++;
        
        Match storage newMatch = matches[matchId];
        newMatch.matchId = matchId;
        newMatch.player1 = msg.sender;
        newMatch.stake = msg.value;
        newMatch.status = MatchStatus.FINDING;
        newMatch.createdAt = block.timestamp;
        
        CharacterInstance storage charInstance = characterInstances[_characterInstanceId];
        CharacterType storage charType = characterTypes[charInstance.characterTypeId];
        
        newMatch.character1 = CharacterInMatch({
            characterInstanceId: _characterInstanceId,
            currentHealth: _getCharacterHealth(charType, charInstance.level),
            currentMana: _getCharacterMana(charType, charInstance.level),
            abilityCooldowns: new uint256[](ABILITIES_PER_CHARACTER)
        });
        
        findingMatches[msg.value].push(matchId);
        
        emit MatchInitiated(matchId, msg.sender, msg.value);
    }
    
    function joinMatch(uint256 _matchId, uint256 _characterInstanceId) 
        external 
        payable 
        whenNotPaused 
        matchExists(_matchId)
        onlyCharacterInstanceOwner(_characterInstanceId)
    {
        Match storage gameMatch = matches[_matchId];
        require(gameMatch.status == MatchStatus.FINDING, "Match not available");
        require(gameMatch.player1 != msg.sender, "Cannot join own match");
        require(msg.value == gameMatch.stake, "Incorrect stake amount");
        require(characterInstances[_characterInstanceId].exists, "Character instance does not exist");
        
        gameMatch.player2 = msg.sender;
        gameMatch.status = MatchStatus.ONGOING;
        gameMatch.currentTurn = gameMatch.player1; // Player 1 starts
        gameMatch.lastMoveTimestamp = block.timestamp;
        
        // Initialize player 2's character
        CharacterInstance storage charInstance = characterInstances[_characterInstanceId];
        CharacterType storage charType = characterTypes[charInstance.characterTypeId];
        
        gameMatch.character2 = CharacterInMatch({
            characterInstanceId: _characterInstanceId,
            currentHealth: _getCharacterHealth(charType, charInstance.level),
            currentMana: _getCharacterMana(charType, charInstance.level),
            abilityCooldowns: new uint256[](ABILITIES_PER_CHARACTER)
        });
        
        // Remove from finding matches
        _removeFromFindingMatches(gameMatch.stake, _matchId);
        
        emit MatchJoined(_matchId, msg.sender);
    }
    
    // Combat System
    function makeMove(uint256 _matchId, uint256 _abilityIndex)
        external
        whenNotPaused
        matchExists(_matchId)
        playerInMatch(_matchId)
        isPlayerTurn(_matchId)
    {
        require(_abilityIndex < ABILITIES_PER_CHARACTER, "Invalid ability index");
        
        Match storage gameMatch = matches[_matchId];
        require(gameMatch.status == MatchStatus.ONGOING, "Match not ongoing");
        
        bool isPlayer1 = (msg.sender == gameMatch.player1);
        CharacterInMatch storage attacker = isPlayer1 ? gameMatch.character1 : gameMatch.character2;
        CharacterInMatch storage defender = isPlayer1 ? gameMatch.character2 : gameMatch.character1;
        
        // Get attacker's character type and abilities
        CharacterInstance storage attackerInstance = characterInstances[attacker.characterInstanceId];
        CharacterType storage attackerType = characterTypes[attackerInstance.characterTypeId];
        Ability storage ability = attackerType.abilities[_abilityIndex];
        
        // Check ability availability
        require(attacker.abilityCooldowns[_abilityIndex] <= gameMatch.turnCount, "Ability on cooldown");
        require(attacker.currentMana >= ability.manaCost, "Not enough mana");
        
        // Consume mana
        attacker.currentMana -= ability.manaCost;
        
        // Set cooldown
        attacker.abilityCooldowns[_abilityIndex] = gameMatch.turnCount + ability.cooldown;
        
        uint256 damage = 0;
        
        // Check if it's a healing ability (abilities with names containing "Heal", "Shield", "Armor", "Restoration", or "Regeneration")
        if (_isHealingAbility(ability.name)) {
            uint256 healAmount = ability.baseDamage;
            CharacterType storage attackerCharType = characterTypes[attackerInstance.characterTypeId];
            uint256 maxHealth = _getCharacterHealth(attackerCharType, attackerInstance.level);
            
            attacker.currentHealth = attacker.currentHealth + healAmount > maxHealth 
                ? maxHealth 
                : attacker.currentHealth + healAmount;
        } else {
            // Calculate damage
            CharacterInstance storage defenderInstance = characterInstances[defender.characterInstanceId];
            CharacterType storage defenderType = characterTypes[defenderInstance.characterTypeId];
            
            damage = _calculateDamage(
                ability.baseDamage,
                attackerInstance.level,
                defenderType,
                defenderInstance.level
            );
            
            // Apply damage
            if (damage >= defender.currentHealth) {
                defender.currentHealth = 0;
            } else {
                defender.currentHealth -= damage;
            }
        }
        
        emit MoveMade(_matchId, msg.sender, _abilityIndex, damage);
        
        // Check for winner
        if (defender.currentHealth == 0) {
            _endMatch(_matchId, msg.sender);
        } else {
            // Switch turns and handle post-move logic
            _handleTurnSwitch(_matchId, isPlayer1, attacker, defender, attackerInstance, msg.sender);
        }
    }
    
    // Timeout Victory
    function claimTimeoutVictory(uint256 _matchId)
        external
        whenNotPaused
        matchExists(_matchId)
        playerInMatch(_matchId)
    {
        Match storage gameMatch = matches[_matchId];
        require(gameMatch.status == MatchStatus.ONGOING, "Match not ongoing");
        require(gameMatch.currentTurn != msg.sender, "It's your turn, cannot claim timeout");
        require(
            block.timestamp >= gameMatch.lastMoveTimestamp + TURN_TIMEOUT,
            "Timeout period not reached"
        );
        
        _endMatch(_matchId, msg.sender);
    }
    
    // Internal Functions
    function _handleTurnSwitch(
        uint256 _matchId,
        bool _isPlayer1,
        CharacterInMatch storage _attacker,
        CharacterInMatch storage _defender,
        CharacterInstance storage _attackerInstance,
        address _currentPlayer
    ) internal {
        Match storage gameMatch = matches[_matchId];
        
        // Switch turns
        gameMatch.currentTurn = _isPlayer1 ? gameMatch.player2 : gameMatch.player1;
        gameMatch.turnCount++;
        gameMatch.lastMoveTimestamp = block.timestamp;
        
        // Regenerate mana for the player who just moved
        CharacterType storage attackerCharType = characterTypes[_attackerInstance.characterTypeId];
        uint256 maxMana = _getCharacterMana(attackerCharType, _attackerInstance.level);
        
        _attacker.currentMana = _attacker.currentMana + MANA_REGEN_PER_TURN > maxMana 
            ? maxMana 
            : _attacker.currentMana + MANA_REGEN_PER_TURN;
        
        // Check for emergency win condition (both players have 0 mana)
        if (_attacker.currentMana == 0 && _defender.currentMana == 0) {
            // Winner is determined by who has more health
            address emergencyWinner = _attacker.currentHealth > _defender.currentHealth 
                ? _currentPlayer 
                : (_isPlayer1 ? gameMatch.player2 : gameMatch.player1);
            _endMatch(_matchId, emergencyWinner);
        }
    }
    
    function _isHealingAbility(string memory _abilityName) internal pure returns (bool) {
        bytes memory nameBytes = bytes(_abilityName);
        bytes memory heal = bytes("Heal");
        bytes memory shield = bytes("Shield");
        bytes memory armor = bytes("Armor");
        bytes memory restoration = bytes("Restoration");
        bytes memory regeneration = bytes("Regeneration");
        bytes memory blessing = bytes("Blessing");
        bytes memory drain = bytes("Drain");
        bytes memory embrace = bytes("Embrace");
        bytes memory divine = bytes("Divine");
        
        return _contains(nameBytes, heal) || 
               _contains(nameBytes, shield) || 
               _contains(nameBytes, armor) || 
               _contains(nameBytes, restoration) || 
               _contains(nameBytes, regeneration) ||
               _contains(nameBytes, blessing) ||
               _contains(nameBytes, drain) ||
               _contains(nameBytes, embrace) ||
               _contains(nameBytes, divine);
    }
    
    function _contains(bytes memory _source, bytes memory _pattern) internal pure returns (bool) {
        if (_pattern.length > _source.length) return false;
        
        for (uint256 i = 0; i <= _source.length - _pattern.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < _pattern.length; j++) {
                if (_source[i + j] != _pattern[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return true;
        }
        return false;
    }
    
    function _calculateDamage(
        uint256 _baseDamage,
        uint256 _attackerLevel,
        CharacterType storage _defenderType,
        uint256 _defenderLevel
    ) internal view returns (uint256) {
        uint256 levelBonus = (_attackerLevel - 1) * 2; // 2 damage per level above 1
        uint256 totalDamage = _baseDamage + levelBonus;
        
        // Apply defense (reduces damage by defense percentage, max 80% reduction)
        uint256 totalDefense = _defenderType.baseDefense + (_defenderLevel - 1) * 5;
        uint256 defenseReduction = totalDefense * 100 / totalDamage;
        if (defenseReduction > 80) defenseReduction = 80;
        
        uint256 finalDamage = totalDamage * (100 - defenseReduction) / 100;
        return finalDamage > 0 ? finalDamage : 1; // Minimum 1 damage
    }
    
    function _endMatch(uint256 _matchId, address _winner) internal {
        Match storage gameMatch = matches[_matchId];
        gameMatch.winner = _winner;
        gameMatch.status = MatchStatus.COMPLETED;
        
        // Update player profiles
        playerProfiles[gameMatch.player1].totalMatches++;
        playerProfiles[gameMatch.player2].totalMatches++;
        
        if (_winner == gameMatch.player1) {
            playerProfiles[gameMatch.player1].wins++;
            playerProfiles[gameMatch.player2].losses++;
        } else {
            playerProfiles[gameMatch.player2].wins++;
            playerProfiles[gameMatch.player1].losses++;
        }
        
        // Award experience to winner's character
        uint256 winnerCharInstanceId = (_winner == gameMatch.player1) ? 
            gameMatch.character1.characterInstanceId : 
            gameMatch.character2.characterInstanceId;
        characterInstances[winnerCharInstanceId].experience += 50;
        
        // Distribute rewards
        uint256 totalPrize = gameMatch.stake * 2;
        uint256 platformFee = totalPrize * platformFeePercentage / 10000;
        uint256 winnerReward = totalPrize - platformFee;
        
        (bool success, ) = payable(_winner).call{value: winnerReward}("");
        require(success, "Winner payment failed");
        
        emit MatchCompleted(_matchId, _winner, winnerReward);
    }
    
    function _removeFromFindingMatches(uint256 _stake, uint256 _matchId) internal {
        uint256[] storage matchIds = findingMatches[_stake];
        for (uint256 i = 0; i < matchIds.length; i++) {
            if (matchIds[i] == _matchId) {
                matchIds[i] = matchIds[matchIds.length - 1];
                matchIds.pop();
                break;
            }
        }
    }
    
    function _getCharacterHealth(CharacterType storage _characterType, uint256 _level) internal view returns (uint256) {
        return _characterType.baseHealth + (_level - 1) * 20;
    }
    
    function _getCharacterMana(CharacterType storage _characterType, uint256 _level) internal view returns (uint256) {
        return _characterType.baseMana + (_level - 1) * 10;
    }
    
    // View Functions
    function getCharacterType(uint256 _characterTypeId) external view validCharacterType(_characterTypeId) returns (
        string memory name,
        string memory description,
        uint256 baseHealth,
        uint256 baseMana,
        uint256 baseDefense
    ) {
        CharacterType storage charType = characterTypes[_characterTypeId];
        return (
            charType.name,
            charType.description,
            charType.baseHealth,
            charType.baseMana,
            charType.baseDefense
        );
    }
    
    function getCharacterTypeAbilities(uint256 _characterTypeId) external view validCharacterType(_characterTypeId) returns (
        string[4] memory names,
        uint256[4] memory baseDamages,
        uint256[4] memory manaCosts,
        uint256[4] memory cooldowns
    ) {
        CharacterType storage charType = characterTypes[_characterTypeId];
        for (uint256 i = 0; i < ABILITIES_PER_CHARACTER; i++) {
            names[i] = charType.abilities[i].name;
            baseDamages[i] = charType.abilities[i].baseDamage;
            manaCosts[i] = charType.abilities[i].manaCost;
            cooldowns[i] = charType.abilities[i].cooldown;
        }
    }
    
    function getCharacterInstance(uint256 _characterInstanceId) external view returns (
        uint256 characterTypeId,
        string memory characterTypeName,
        uint256 level,
        uint256 health,
        uint256 mana,
        uint256 defense,
        uint256 experience,
        address owner
    ) {
        CharacterInstance storage charInstance = characterInstances[_characterInstanceId];
        require(charInstance.exists, "Character instance does not exist");
        
        CharacterType storage charType = characterTypes[charInstance.characterTypeId];
        
        return (
            charInstance.characterTypeId,
            charType.name,
            charInstance.level,
            _getCharacterHealth(charType, charInstance.level),
            _getCharacterMana(charType, charInstance.level),
            charType.baseDefense + (charInstance.level - 1) * 5,
            charInstance.experience,
            charInstance.owner
        );
    }
    
    function getPlayerProfile(address _player) external view returns (
        uint256[] memory ownedCharacterInstances,
        uint256 totalMatches,
        uint256 wins,
        uint256 losses
    ) {
        PlayerProfile storage profile = playerProfiles[_player];
        return (
            profile.ownedCharacterInstances,
            profile.totalMatches,
            profile.wins,
            profile.losses
        );
    }
    
    function getMatch(uint256 _matchId) external view matchExists(_matchId) returns (
        address player1,
        address player2,
        uint256 stake,
        address currentTurn,
        address winner,
        MatchStatus status,
        uint256 turnCount,
        uint256 lastMoveTimestamp
    ) {
        Match storage gameMatch = matches[_matchId];
        return (
            gameMatch.player1,
            gameMatch.player2,
            gameMatch.stake,
            gameMatch.currentTurn,
            gameMatch.winner,
            gameMatch.status,
            gameMatch.turnCount,
            gameMatch.lastMoveTimestamp
        );
    }
    
    function getMatchCharacters(uint256 _matchId) external view matchExists(_matchId) returns (
        uint256 char1InstanceId,
        uint256 char1Health,
        uint256 char1Mana,
        uint256 char2InstanceId,
        uint256 char2Health,
        uint256 char2Mana
    ) {
        Match storage gameMatch = matches[_matchId];
        
        // Only reveal character information once both players have joined
        require(gameMatch.status != MatchStatus.FINDING, "Character information not available during matchmaking");
        
        return (
            gameMatch.character1.characterInstanceId,
            gameMatch.character1.currentHealth,
            gameMatch.character1.currentMana,
            gameMatch.character2.characterInstanceId,
            gameMatch.character2.currentHealth,
            gameMatch.character2.currentMana
        );
    }
    
    function getFindingMatches(uint256 _stake) external view returns (uint256[] memory) {
        return findingMatches[_stake];
    }
    
    // Safe function to get basic match info without revealing character selection during matchmaking
    function getMatchBasicInfo(uint256 _matchId) external view matchExists(_matchId) returns (
        address player1,
        address player2,
        uint256 stake,
        MatchStatus status,
        uint256 createdAt
    ) {
        Match storage gameMatch = matches[_matchId];
        return (
            gameMatch.player1,
            gameMatch.player2,
            gameMatch.stake,
            gameMatch.status,
            gameMatch.createdAt
        );
    }
    
    function getAllCharacterTypes() external pure returns (uint256[] memory) {
        uint256[] memory types = new uint256[](TOTAL_CHARACTER_TYPES);
        for (uint256 i = 1; i <= TOTAL_CHARACTER_TYPES; i++) {
            types[i-1] = i;
        }
        return types;
    }
    
    function getTimeLeftForCurrentTurn(uint256 _matchId) external view matchExists(_matchId) returns (uint256) {
        Match storage gameMatch = matches[_matchId];
        if (gameMatch.status != MatchStatus.ONGOING) return 0;
        
        uint256 timeElapsed = block.timestamp - gameMatch.lastMoveTimestamp;
        if (timeElapsed >= TURN_TIMEOUT) return 0;
        
        return TURN_TIMEOUT - timeElapsed;
    }
    
    // Admin Functions
    function setPlatformFee(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 1000, "Fee cannot exceed 10%"); // Max 10%
        platformFeePercentage = _feePercentage;
    }
    
    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdrawal failed");
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency function to cancel stuck matches
    function emergencyCancelMatch(uint256 _matchId) external onlyOwner matchExists(_matchId) {
        Match storage gameMatch = matches[_matchId];
        require(gameMatch.status == MatchStatus.ONGOING, "Match not ongoing");
        require(block.timestamp > gameMatch.createdAt + MAX_TURN_TIME * 10, "Match not stuck long enough");
        
        gameMatch.status = MatchStatus.COMPLETED;
        
        // Refund both players
        (bool success1, ) = payable(gameMatch.player1).call{value: gameMatch.stake}("");
        (bool success2, ) = payable(gameMatch.player2).call{value: gameMatch.stake}("");
        
        require(success1 && success2, "Refund failed");
    }
}