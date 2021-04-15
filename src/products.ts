export function getProducts(): Product[] {
    return [
        {
            name: "Prison",
            roleId: "792867173194006529",
            possibleNames: ["SuperiorPrison", "ExclusivePrison"]
        },
        {
            name: "BossesExpansion",
            roleId: "792867178860511282",
            possibleNames: []
        }
    ]
}

export interface Product {
    name: string
    roleId: string
    possibleNames: string[]
}