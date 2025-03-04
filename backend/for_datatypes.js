import neo4j from 'neo4j-driver';

/**
 * Esta función verifica el tipo de dato de las propiedades y devuelve el tipo correcto
 * para enviarlo a la base de datos
 * @param {*} properties 
 * @returns properties array con el tipo de dato correcto
 */
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