import neo4j from 'neo4j-driver';

const transformProperties = (properties) => {
    const transformed = {};

    for (const key in properties) {
        if (
            typeof properties[key] === "object" &&
            properties[key] !== null &&
            "value" in properties[key] &&
            "type" in properties[key] &&
            properties[key].type === "date"
        ) {
            // Convertir el string a una fecha con solo año, mes y día
            const [year, month, day] = properties[key].value.split("-").map(Number);
            const myDate = new neo4j.types.Date(year, month, day);
            transformed[key] = myDate;
        } else {
            transformed[key] = properties[key];
        }
    }
    return transformed;
};

export default transformProperties;