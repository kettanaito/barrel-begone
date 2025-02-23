import ts from 'typescript';
import { red, bold, yellow } from 'kleur/colors';

const has = arr => Array.isArray(arr) && arr.length > 0;

/**
 * @example export { var1, var2 };
 */
function hasNamedExports(node) {
  if (has(node?.exportClause?.elements)) {
    return true;
  }
  return false;
}

/**
 * @example export { var1, var2 } from 'foo';
 */
function isReexport(node) {
  if (node?.moduleSpecifier !== undefined) {
    return true;
  }
  return false;
}

/**
 * Count the amount of exports and declarations in a source file
 * If a file has more exports than declarations, its a barrel file
 */
export function analyzeFile(source, file) {
  let exports = 0;
  let declarations = 0;

  ts.forEachChild(source, (node) => {
    if (node.kind === ts.SyntaxKind.ExportDeclaration) {
      /**
       * @example export { var1, var2 };
       */
      if (hasNamedExports(node) && !isReexport(node)) {
        exports += node.exportClause?.elements?.length;
      }  
      /**
       * @example export * from 'foo';
       * @example export * from './my-module.js';
       */
      else if (isReexport(node) && !hasNamedExports(node)) {
        // @TODO do the same for import * as foo from 'foo'?
        console.log(`${bold(yellow('[WARNING]'))}: "${file}" reexports all exports from "${node.moduleSpecifier.text}", this should be avoided because it leads to unused imports, and makes it more difficult to tree-shake correctly.`);
        exports++;
      }

      /**
       * @example export { var1, var2 } from 'foo';
       * @example export { var1, var2 } from './my-module.js';
       */
      else if (isReexport(node) && hasNamedExports(node)) {
        exports += node.exportClause?.elements?.length;
      }
    }      
    /**
    * @example export default { var1, var };
    */
    else if (
      node.kind === ts.SyntaxKind.ExportAssignment && 
      node.expression.kind === ts.SyntaxKind.ObjectLiteralExpression
    ) {
      exports += node.expression.properties.length;
    }

    if (
      ts.isVariableStatement(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node)
    ) {
      declarations++;
    }
  });

  return { exports, declarations };
}