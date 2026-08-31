const CHANNELS_DATA = [
    { gateA: 64, gateB: 47, centerA: 'Head', centerB: 'Ajna', type: 'straight' },
    { gateA: 10, gateB: 34, centerA: 'G-Center', centerB: 'Sacral', type: 'straight' },
    { gateA: 10, gateB: 20, centerA: 'G-Center', centerB: 'Throat', type: 'straight' },
    { gateA: 20, gateB: 34, centerA: 'Throat', centerB: 'Sacral', type: 'bent_34_20' },
    { gateA: 34, gateB: 57, centerA: 'Sacral', centerB: 'Spleen', type: 'straight' },
    { gateA: 10, gateB: 57, centerA: 'G-Center', centerB: 'Spleen', type: 'straight' },
    { gateA: 20, gateB: 57, centerA: 'Throat', centerB: 'Spleen', type: 'straight' }
];

const RULERS_NIDANA = {
  '34.4': {up:['Плутон'], down:['Марс']}
};
const lineFixations = {};

function isPlanetInGate(planetName, targetGate, chartData) {
    let checkName = planetName;
    if (planetName.includes("Северный Узел")) checkName = "Северный узел";
    else if (planetName.includes("Южный Узел")) checkName = "Южный узел";
    
    for (let p of chartData.planets) {
        let pName = p.name;
        if (pName.includes("Северный Узел")) pName = "Северный узел";
        else if (pName.includes("Южный Узел")) pName = "Южный узел";
        if (pName === checkName && p.hexagram && p.hexagram.gate === targetGate) return true;
    }
    if (chartData.design_planets) {
        for (let p of chartData.design_planets) {
            let pName = p.name;
            if (pName.includes("Северный Узел")) pName = "Северный узел";
            else if (pName.includes("Южный Узел")) pName = "Южный узел";
            if (pName === checkName && p.hexagram && p.hexagram.gate === targetGate) return true;
        }
    }
    return false;
}

function getOppositeGates(gate) {
    let ops = [];
    if (typeof CHANNELS_DATA !== 'undefined') {
        CHANNELS_DATA.forEach(ch => {
            if (ch.gateA === gate) ops.push(ch.gateB);
            if (ch.gateB === gate) ops.push(ch.gateA);
        });
    }
    return ops;
}

function getFixation(planetName, gate, line, chartData) {
    const key = `${planetName}-${gate}-${line}`;
    if (lineFixations[key]) return lineFixations[key];

    let activeName = planetName;
    if (activeName.includes("Северный Узел")) activeName = "Северный узел";
    else if (activeName.includes("Южный Узел")) activeName = "Южный узел";

    if (typeof RULERS_NIDANA !== 'undefined') {
        const entry = RULERS_NIDANA[`${gate}.${line}`];
        if (entry) {
            if (entry.up) {
                for (let upPlanet of entry.up) {
                    let matchName = upPlanet;
                    if (matchName === 'Северный узел') matchName = 'Северный узел';
                    if (matchName === 'Южный узел') matchName = 'Южный узел';
                    if (activeName === matchName) return "exalted";
                    if (chartData) {
                        const opposites = getOppositeGates(gate);
                        for (let oppGate of opposites) {
                            if (isPlanetInGate(matchName, oppGate, chartData)) return "exalted";
                        }
                    }
                }
            }
        }
    }
    return "none";
}

const data = {
    planets: [
        { name: 'Меркурий', hexagram: { gate: 34, line: 4 } },
        { name: 'Плутон', hexagram: { gate: 57, line: 1 } }
    ],
    design_planets: []
};

console.log(getFixation('Меркурий', 34, 4, data));

