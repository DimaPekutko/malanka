import { dump, SharedLibManager, LogManager } from 'utils';
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

export class TypeSymbol extends Symbol {
    type_name: string
    constructor(type_name: string) {
        super()
        this.type_name = type_name
    }
}

export class SymbolTable {
    readonly symbols: Map<string, Symbol>
    readonly uid: string
    readonly nesting_lvl: number
    readonly parent_scope: SymbolTable | null = null
    constructor(uid: string, nesting_lvl: number, parent_scope: SymbolTable | null) {
        this.symbols = new Map()    
        this.uid = uid
        this.nesting_lvl = nesting_lvl
        this.parent_scope = parent_scope
    }
    get(name: string): Symbol | null {
        let cur_scope: SymbolTable | null = this
        let symbol
        while(cur_scope !== null) {
            symbol = cur_scope.symbols.get(name)
            if (symbol !== undefined) {
                return symbol
            }
            cur_scope = cur_scope.parent_scope
        }
        return null
    }
    get_local(name: string): Symbol | null {
        let symbol = this.symbols.get(name)!
        return symbol || null 
    }
    set(name: string, value: Symbol): void {
        this.symbols.set(name, value)
    }
}

export class SymbolManager {
    readonly SCOPES: SymbolTable[]
    // readonly GLOBAL_SCOPE: SymbolTable
    // readonly FUNC_SCOPES: SymbolTable[]
    readonly shared_libs_list: string[]
    constructor() {
        this.SCOPES = []
        this.shared_libs_list = []
    }
    new_scope(uid: string, nesting_lvl: number, parent_scope: SymbolTable | null): SymbolTable {
        const new_scope = new SymbolTable(uid, nesting_lvl, parent_scope)
        this.SCOPES.push(new_scope)
        return this.SCOPES[this.SCOPES.length-1]
    }
    get_scope(uid: string): SymbolTable | null {
        let scope = null
        for (let i = 0; i < this.SCOPES.length; i++) {
            scope = this.SCOPES[i]
            if (String(scope.uid) === String(uid)) {
                return scope
            }
        }
        return null
    }
    load_shared_symbols(dist: string): void {
        if (!this.SCOPES[0]) {
            throw new Error("Cannot execute load_shared_symbols function (no global scope).")
        }
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
                        this.SCOPES[0].set(name, imported_symbol)
                    }
                }
            }
        }
    }
}

