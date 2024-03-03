**For special abilities, advantages, disadvantages, consumables, spells, liturgies, rituals and ceremonies see this page**

[Contribute to abilities](abilities.md)

[Ability automation coverage](summary.md)



# Extension DB for DSA5/TDE5 in Foundry VTT
This is the database for spell and liturgy extensions and their active effects for Foundry VTT. As there are roughly 3000 extensions distributed among spells, liturgical chants, rituals and ceremonies a complete coverage or functionality is only possible through joined efforts by the community of TDE/DSA. Feel free to contribute, we'll add the effects in intervals to the official modules.

**This functionality requires at least Foundry DSA 4.1.0**

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

| Key                               | Effect(en)         | Effect(de)                       |               Example | type    |
|-----------------------------------|:-------------------|----------------------------------|----------------------:|---------|
| system.castingTime.value          | Casting time       | Zauberdauer                      |                     5 | number  |
| system.AsPCost.value              | AE cost            | AsP cost                         |                     2 | number  |
| system.maintainCost.value         | Maintain cost      | Aufrechterhalten kosten          | "5 AsP pro 5 Minuten" | string  |
| system.effectFormula.value        | Damage roll *1     | Schadenswurf *1                  |              "+2+1d6" | string  |
| system.range.value                | Range              | Reichweite                       |          "32 Schritt" | string  |
| system.duration.value             | Duration           | Dauer                            |                "5 KR" | string  |
| system.variableBaseCost           | variable AE cost   | Variable AsP kosten              |                "true" | boolean |
| system.canChangeCastingTime.value | variable cast time | Variable Zauberdauer             |                "true" | boolean |
| system.targetCategory.value       | Target category    | Zielkategorie                    |           "Lebewesen" | string  |
| system.target.value               | size of aoe \*2    | Größe des Flächeneffekts \*2     |                "qs*2" | string  |
| defenseMalus                      | Defense malus      | Verteidigungsmalus               |                    -2 | number  |
| forceSpell.mod                    | Force Modifier     | Erzwingen Modifikator            |                     1 | number  |
| reduceCostSpell.mod               | Cost modifier      | Zauberkosten reduzieren (Zauber) |                     1 | number  |
| increaseRangeSpell.mod            | Force Modifier     | Erzwingen Modifikator            |                     1 | number  |
| increaseCastingTime.mod           | Force Modifier     | Erzwingen Modifikator            |                     1 | number  |
| decreaseCastingTime.mod           | Force Modifier     | Erzwingen Modifikator            |                     1 | number  |
| removeGesture.mod                 | Force Modifier     | Erzwingen Modifikator            |                     1 | number  |
| removeFormula.mod                 | Force Modifier     | Erzwingen Modifikator            |                     1 | number  |
| extensionModifier.mod             | Flat Modifier      | Modifikator                      |                     1 | number  |
| system.target.type                | Area effect shape  | Flächeneffekt Form               |               "sphere"| string  |
| system.target.value               | Area effect size   | Flächeneffekt Große (Schritt)    |                 "QS*2"| string  |
| system.target.angle               | Cone opening       | Kegel Öffnungswinkel             |                    45 | number  |
| system.target.width               | Line width         | Linienbreite (Schritt)           |                     2 | String  |


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

## Area effect shapes

### Allowed types
* cube
* line
* sphere
* cone

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
}
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
|elementarium_ceremony|12/30|40.0|
|elementarium_ritual|42/80|52.5|
|elementarium_spell|91/175|52.0|
|goetterwirken2_ceremony|75/262|28.6|
|goetterwirken2_liturgy|81/245|33.1|
|goetterwirken2_spell|0/5|0.0|
|goetterwirken_ceremony|152/394|38.6|
|goetterwirken_liturgy|248/632|39.2|
|magie1_ritual|73/95|76.8|
|magie1_spell|382/702|54.4|
|magie2_ritual|167/190|87.9|
|magie2_spell|153/380|40.3|
|magie3_ritual|74/76|97.4|
|magie3_spell|107/199|53.8|
|nekromanthaeum_ceremony|1/5|20.0|
|nekromanthaeum_liturgy|1/6|16.7|
|nekromanthaeum_ritual|8/10|80.0|
|nekromanthaeum_spell|26/37|70.3|
|studyroom_ritual|60/81|74.1|
|studyroom_spell|116/280|41.4|
|partly done|2002/3884|51.5|
|progress|1869/3884|48.1|

