**For the current state of the automations see**
[Ability automation coverage](summary.md)

# What is this about
This is a location to see what abilities have already been automated for The dark eye in foundry.
Also it is a place to put contributions. 
You can bring following things to help advancing the automations.
* Contributions
* Ideas
* Whishes
* Bureaucracy help

We reached now a state where we think TDE is playable exceptionally well and we don't have to change a lot anymore for special abilities. So now we can accept help to improve the system even more without risking work to be in vane because of frequent changes in the system. If you want to help, you are now invited to do so, thanks!
But our base intention stays the same, we want to cover as much as possible and we will add more from time to time.

# Disclaimer
We will remove, rewrite or add any of your contributions as we see fit. 

# General Info
We aim for 60 to 80% coverage for each module, whenever it is possible. Due to the complex implications of the abilities in TDE this is not always possible or requires additional features added to the base system to support more modifiers. This is why we gradually increase the coverage for abilities whenever new features allow to do so.

Generally there are following categories:
* Abilities which are only fluff or can not be automated. Such are marked done immediately (like e.g. time travel)
* Abilities which add constant modifiers (Speed +1)
* Abilities which add stuff conditionally (mostly spell e.g. +QL willpower)
* Complex abilities which require a macro (programming) to be working
* Abilities which can only be integrated hard coded into the base system because their complexity alters the flow of base functions significantly

# What can I do to contribute?
* Write tickets for abilities you'd like to have automated. This way we know what might be important.
* Write tickets for abilities which don't work as you expected or which are missing details
* The folder abilitydbs contains abilities which are not yet automated. You can add tags to those to help group updates and define new features required for the base system. This should look like this:
```json
"beschwörer": {
    "sources": ["somebook"],
    "tags": "service"
}
```
The example adds the tag "service to that ability. So we know this ability adds additional services during a summoning process. So whenever we add that feature, we can immediately modify those abilities.
* You can add the "done" key to the abilitydbs where you think the automation is fine. (we sometimes miss to set that key)
```json
"beschwörer": {
    "sources": ["somebook"],
    "done": true
}
```
* You can provide macros. For abilities you created yourself. Put those macros in the macros folder in this repository. We'll add a detailed explanation how to generate and test those soon.


More information to come...

## Current Tags

| Tag | en | de |
| --- | --- | --- |
| service | Service | Dienst |