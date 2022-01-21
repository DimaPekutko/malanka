import { dump, SharedLibManager } from 'utils';
import { TypeNode } from './AST/AST';


export abstract class Symbol {
    IS_EXTERNAL: boolean = false
    name!: string
}

export class VarSymbol extends Symbol {
    type: TypeNode
    constructor(name: string, type: TypeNode) {
        super()
        this.name = name
        this.type = type
    }
}

export class FuncSymbol extends Symbol {
    constructor(name: string) {
        super()
        this.name = name
    }
}

export class SymbolTable {
    readonly symbols: Map<string, Symbol>
    readonly name: string
    readonly nesting_lvl: number
    constructor(name: string, nesting_lvl: number) {
        this.symbols = new Map()    
        this.name = name
        this.nesting_lvl = nesting_lvl
    }
    get(name: string): Symbol {
        return this.symbols.get(name)!
    }
    set(name: string, value: Symbol): void {
        this.symbols.set(name, value)
    }
}

export class SymbolManager {
    readonly GLOBAL_SCOPE: SymbolTable
    readonly FUNC_SCOPES: SymbolTable[]
    readonly shared_libs_list: string[]
    constructor() {
        this.GLOBAL_SCOPE = new SymbolTable("global", 1)
        this.FUNC_SCOPES = []
        this.shared_libs_list = []
    }
    new_func_scope(name: string): void {
        this.FUNC_SCOPES.push(new SymbolTable(name, 2))
    }
    get_func_scope(func_name: string): SymbolTable | null {
        for(let i = 0; i < this.FUNC_SCOPES.length; i++) {
            if(this.FUNC_SCOPES[i].name === func_name) {
                return this.FUNC_SCOPES[i]
            }
        }
        return null
    }
    load_shared_symbols(dist: string): void {
        this.shared_libs_list.push(dist)
        const import_names = SharedLibManager.get_lib_symbols(dist)
        const import_json = JSON.parse(import_names)
        let size
        let name
        let type
        let imported_symbol
        for(let i = 0; i < import_json.length; i++) {
            size = parseInt(import_json[i].size)
            name = import_json[i].name.split("@")[0]
            type = import_json[i].type
            // dont import private values and empty values
            if(name[0] !== "_" && size !== 0) {
                switch (type) {
                    case "FUNC": {
                        imported_symbol = new FuncSymbol(name)
                        imported_symbol.IS_EXTERNAL = true
                        this.GLOBAL_SCOPE.set(name, imported_symbol)
                    }
                }
            }
        }
    }
}

