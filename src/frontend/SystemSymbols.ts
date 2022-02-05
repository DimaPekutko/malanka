import { DATA_TYPES } from 'frontend/DataTypes';
import { TypeNode } from './AST/AST';
import { VarSymbol } from './SymbolManager';

// Language builtin symbols (values will be set up in backend bootstrap)
const argc_type = new TypeNode(DATA_TYPES.pointer)
argc_type.points_to_type = DATA_TYPES.int
export const __ARGC__ = new VarSymbol("__ARGC__", argc_type)

const argv_type = new TypeNode(DATA_TYPES.pointer)
argv_type.points_to_type = DATA_TYPES.str
export const __ARGV__ = new VarSymbol("__ARGV__", argv_type)