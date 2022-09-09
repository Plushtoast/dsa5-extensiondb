# Extension DB for DSA5/TDE5 in Foundry VTT
This is the database for spell and liturgy extensions and their active effects for Foundry VTT. As there are roughly 5000 extensions distributed among spells, liturgical chants, rituals and ceremonies a complete coverage or functionality is only possible through joined efforts by the community of TDE/DSA. Feel free to contribute, we'll add the effects in intervals to the official modules.

**This functionality requires at least Foundry DSA 4.1.0**
**Please don't add Extensions from Rohal yet, we are not quite there...**

# Contribution
Everyone is invited to add missing keys to extensions. Please create a pull request.
Steps involved:
* open the db file where you want to add extensions
* edit the file
* Create a pull request
* Write an issue for effects which are not coverable at the moment but desired

See chapter allowed keys for currently possible modifications.

Set the key "complete" to true if the effect is automated to 100% (some effects might not be possible)

A proper entry looks like this:
```json
{
    "Ignifaxius": [
        {
            "name": "Intensiver Strahl",
            "complete": false,
            "changes": [
                {"key": "system.AsPCost.value", "mode": 2, "value": 2}
            ]
        },
        {
            "name": "Windender Strahl",
            "complete": true,
            "changes": [
                {"key": "system.AsPCost.value", "mode": 2, "value": 2},
                {"key": "defenseMalus", "mode": 2, "value": -2}
            ]
        },
        {
            "name": "Zwei Ziele",
            "complete": true,
            "changes": [
                {"key": "system.AsPCost.value", "mode": 1, "value": 2}
            ]
        }
    ],
    "Visibili": [
        {
            "name": "Andere Kosten",
            "complete": true,
            "changes": [
                {"key": "system.maintainCost.value", "mode": 5, "value": "8 AsP pro 30 Minuten"}
            ]
        },
        {
            "name": "Keine Aufrechterhaltung",
            "complete": true,
            "changes": [
                {"key": "system.maintainCost.value", "mode": 5, "value": "0"},
                {"key": "system.variableBaseCost", "mode": 5, "value": "true"}
            ]
        },
        {
            "name": "Unsichtbare Kleidung",
            "complete": true,
            "changes": [
            ]
        }
    ]
}
```

If you are more experienced you can use the tooling of your choice obviously.


## Allowed keys
The following keys can be used to modify the spells:

| Key                        | Effect(en)            | Effect(de)              | Example              |
| -------------------------- |:---------------------:|:-----------------------:| -------------------- |
| system.castingTime.value   | Casting time          | Zauberdauer             |                 5    |
| system.AsPCost.value       | AE cost               | AsP cost                |                 2    |
| system.maintainCost.value  | Maintain cost         | Aufrechterhalten kosten | 5 AsP pro 5 Minuten  |
| system.effectFormula.value | Damage roll           | Schadenswurf            |             +2+1d6   |
| system.range.value         | Range                 | Reichweite              |           32 Schritt |
| system.duration.value      | Duration              | Dauer                   |                 5 KR |
| defenseMalus               | Defense malus         | Verteidigungsmalus      |                 -2   |


See also existing extensions as example.

## Allowed mode values
| mode   | meaning  |
| ------ | -------  |
| 1      | Multiply |
| 2      | Add      |
| 3      | Downgrade|
| 4      | Upgrade  |
| 5      | Override |