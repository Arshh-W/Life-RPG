import math
from dataclasses import dataclass
from datetime import date, timedelta

LEVEL_BASE_XP = 100
# Increased to 1.35 for a steeper, non-linear difficulty curve late-game
LEVEL_GROWTH = 1.35 

@dataclass(frozen=True)
class CategoryRule:
    key: str
    label: str
    attribute: str
    xp_reward: int
    coin_reward: int
    description: str

CATEGORY_RULES = {
    "intelligence": CategoryRule("intelligence", "Intelligence", "intelligence", 100, 12, "Study, coding, writing, and analytical work."),
    "physicality": CategoryRule("physicality", "Physicality", "strength", 80, 10, "Training, movement, nutrition, and recovery."),
    "social": CategoryRule("social", "Social & emotional", "emotional_intelligence", 90, 11, "Community, kindness, and relationship-building."),
}

def calculate_streak_multiplier(discipline: int, current_streak: int) -> float:
    """
    DIS acts as the overarching multiplier for maintaining consecutive daily streaks.
    Uses a logarithmic curve to prevent early-game economy breaks while heavily
    rewarding high-DIS players in the late game.
    """
    if current_streak <= 0:
        return 1.0
    # The multiplier scales with both streak length and Discipline
    dis_bonus = math.log10(current_streak + 1) * (discipline * 0.05)
    return round(1.0 + dis_bonus, 2)

def xp_required_for_level(level: int) -> int:
    if level < 1:
        raise ValueError("Level must be at least 1")
    return int(LEVEL_BASE_XP * (LEVEL_GROWTH ** (level - 1)))

def level_for_xp(xp: int) -> int:
    if xp < 0:
        raise ValueError("XP cannot be negative")
    level = 1
    total_required = 0
    while total_required + xp_required_for_level(level) <= xp:
        total_required += xp_required_for_level(level)
        level += 1
    return level

def progression_snapshot(xp: int) -> dict[str, int | float]:
    level = level_for_xp(xp)
    level_start = sum(xp_required_for_level(current_level) for current_level in range(1, level))
    next_threshold = level_start + xp_required_for_level(level)
    return {
        "level": level,
        "xp": xp,
        "level_start_xp": level_start,
        "next_level_xp": next_threshold,
        "level_progress": round((xp - level_start) / (next_threshold - level_start) * 100, 2),
    }

def next_streak(last_activity: date | None, today: date) -> int:
    if last_activity == today:
        return 0
    if last_activity == today - timedelta(days=1):
        return 1
    return 1

def streak_is_continuous(last_activity: date | None, today: date) -> bool:
    return last_activity in {today, today - timedelta(days=1)}