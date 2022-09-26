# Extension DB for DSA5/TDE5 in Foundry VTT
This is the database for spell and liturgy extensions and their active effects for Foundry VTT. As there are roughly 3000 extensions distributed among spells, liturgical chants, rituals and ceremonies a complete coverage or functionality is only possible through joined efforts by the community of TDE/DSA. Feel free to contribute, we'll add the effects in intervals to the official modules.

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

Set the key "complete" to true if the effect is automated to 100% (some effects might not be possible, see when to "complete")

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
You can also add a "comment" key if you need to add information:

```json
{
    "name": "Unsichtbare Kleidung",
    "complete": true,
    "comment": "what a wonderful day",
    "changes": [
    ]
}
```

## Allowed keys
The following keys can be used to modify the spells:

| Key                        | Effect(en)            | Effect(de)              | Example              | type   |
| -------------------------- |:---------------------:|:-----------------------:| -------------------- | ------ |
| system.castingTime.value   | Casting time          | Zauberdauer             |                 5    | number |
| system.AsPCost.value       | AE cost               | AsP cost                |                 2    | number |
| system.maintainCost.value  | Maintain cost         | Aufrechterhalten kosten | "5 AsP pro 5 Minuten"| string |
| system.effectFormula.value | Damage roll *1         | Schadenswurf *1         |             "+2+1d6"  | string |
| system.range.value         | Range                 | Reichweite              |         "32 Schritt" | string |
| system.duration.value      | Duration              | Dauer                   |               "5 KR" | string |
| system.variableBaseCost    | variable AE cost      | Variable AsP kosten     |                "true"| boolean |
| system.canChangeCastingTime| variable cast time    | Variable Zauberdauer    |                "true"| boolean |
| system.targetCategory.value| Target category       | Zielkategorie           | "Lebewesen"          | string |
| system.target.value        | size of aoe \*2       | Größe des Flächeneffekts \*2 | "qs*2"               | string |
| defenseMalus               | Defense malus         | Verteidigungsmalus      |                 -2   | number |

*1 The damage roll is a string and has to be preceded with a "+" or "-" for mode 2.
*2 This is not reflected in spell data yet

See also existing extensions as example.

## Allowed mode values
| mode   | meaning  |
| ------ | -------  |
| 1      | Multiply |
| 2      | Add      |
| 3      | Downgrade|
| 4      | Upgrade  |
| 5      | Override |

## When to "complete"
Setting the key "completed" to true is a completely arbitrary decission. If the automation is working with all required modifiers, set it to true. If it's missing an aspect don't.
See following examples: 

![image](https://user-images.githubusercontent.com/44941845/189488332-7e3ae10a-d67f-459b-bc02-c38a56656b63.png)
```json
{
    "name": "Intensiver Strahl",
    "complete": false,
    "changes": [
        {"key": "system.AsPCost.value", "mode": 2, "value": 2}
    ]
}
```
The automation is not finished because the extension can not add the status burning automatically.
<hr/>

![image](https://user-images.githubusercontent.com/44941845/189488419-9bf95826-4d49-47c6-8c6a-7b7dabd7e821.png)
```json
{
    "name": "Windender Strahl",
    "complete": true,
    "changes": [
        {"key": "system.AsPCost.value", "mode": 2, "value": 2},
        {"key": "defenseMalus", "mode": 2, "value": -2}
    ]
},
```
The automation adds all required modifiers (AsP & defenseMalus). Complete should be true
<hr/>

![image](https://user-images.githubusercontent.com/44941845/189488470-9578a08b-eb51-4535-9795-209e7340cf21.png)
```json
{
    "name": "Unsichtbare Kleidung",
    "complete": true,
    "changes": [
    ]
}
```
The automation is barely possible or the effect is fluff. Complete should be true.

## Type meaning
**number**: value has to be a number

**boolean**: value has to be "true" or "false" (with quotation marks)

**string**: value can be any text enclosed in quotation marks

# Status
|name|status| % |
| -- | ---- | - |
|elementarium_ceremony|0/18|0.0|
|elementarium_ritual|0/48|0.0|
|elementarium_spell|0/105|0.0|
|goetterwirken2_ceremony|57/147|38.8|
|goetterwirken2_liturgy|81/141|57.4|
|goetterwirken2_spell|0/3|0.0|
|goetterwirken_ceremony|149/222|67.1|
|goetterwirken_liturgy|248/354|70.1|
|magie1_ritual|22/57|38.6|
|magie1_spell|202/412|49.0|
|magie2_ritual|71/111|64.0|
|magie2_spell|91/222|41.0|
|magie3_ritual|28/45|62.2|
|magie3_spell|78/117|66.7|
|nekromanthaeum_ceremony|1/3|33.3|
|nekromanthaeum_liturgy|1/3|33.3|
|nekromanthaeum_ritual|5/6|83.3|
|nekromanthaeum_spell|15/22|68.2|
|partly done|1128/2036|55.4|
|progress|1049/2036|51.5|


