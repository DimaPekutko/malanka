import llvm from "llvm-bindings";

type AllocaTable = Map<llvm.Function, Map<string, llvm.AllocaInst>>

export default class AllocaManager {
  private global_func!: llvm.Function
  private table!: AllocaTable

  constructor() {
    this.table = new Map<llvm.Function, Map<string, llvm.AllocaInst>>()
  }

  set_global_scope(func: llvm.Function): void {
    this.global_func = func
    this.new_scope(func)
  }
  
  new_scope(func: llvm.Function): void {
    this.table.set(func, new Map())
  }

  set(func: llvm.Function, name: string, alloca: llvm.AllocaInst): void {
    if (this.table.has(func)) {
      this.table.get(func)?.set(name, alloca)
    }
  }

  get(func: llvm.Function, name: string): llvm.AllocaInst | undefined {
    func = this.table.get(func)?.has(name) ? func : this.global_func
    return this.table.get(func)?.get(name)
  }

}