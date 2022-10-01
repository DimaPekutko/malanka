import { SymbolManager } from "./../frontend/SymbolManager";
import { AstNode } from "./../frontend/AST/AST";

export default abstract class BaseBackend {
  abstract ast: AstNode
  abstract compile(): void;
  constructor(ast: AstNode, symbol_manager: SymbolManager) {}
}