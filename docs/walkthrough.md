# 120-second walkthrough

Use this script to record the required public walkthrough with a screen recorder.

## 0:00-0:20 - Enter the realm

Open the deployed frontend. Show the Realms of Routine landing screen, then register a new character. The login form should be completed with Tab, Enter, and Space only.

## 0:20-0:45 - Create a quest

Create a quest named `Morning training`, choose `Physicality`, and mark it as a Daily Trinity quest. Show that the quest appears in the active quest list with a server-assigned XP reward.

## 0:45-1:10 - Complete and level

Clear the quest. Show the optimistic completion state, XP toast, coin increase, Strength attribute movement, and streak counter. If the account is near a threshold, show the level-up toast.

## 1:10-1:30 - Spend the reward

Open the Reward Vault and purchase an affordable item. Show the coin balance decrease and the item quantity update.

## 1:30-2:00 - Prove persistence

Refresh the page. Log in again if needed. Show that the quest completion, XP, streak, coin balance, and owned reward came back from the backend database rather than browser-only state.

Keep the final recording between 90 and 180 seconds, export it under 100 MB, and publish it without requiring viewer authentication.

## Deployment checks

Before recording against a deployment, verify:

```powershell
curl https://YOUR_API_HOST/health
```

The response must include `{"status":"ok","database":"ok"}`. Start PostgreSQL and the API before opening the frontend so the walkthrough proves real persistence.
