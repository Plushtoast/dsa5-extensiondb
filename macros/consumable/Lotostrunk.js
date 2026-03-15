  const sk = [0,1,2,2,3,3][qs-1];
                const sk2 = [1,1,2,2,3,3][qs-1];
                const fk = [0,0,0,0,1,2][qs-1];
                let condition = {
                name: "Lotostrunk",
                icon: "icons/svg/aura.svg",
                changes: [
                { key: "system.skillModifiers.step", mode: 0, value: `Odem Arcanum ${sk};Analys Arkanstruktur ${sk2};Magiekunde ${fk} ` }],
                duration: {
                seconds: 30*60,
                startTime: game.time.worldTime
                },
                flags: {
                dsa5: {
                description: "Lotostrunk"
                }
                }
                }
                await actor.addCondition(condition);
