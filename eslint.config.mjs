import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier/flat'

const config = [
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // Regras novas do React Compiler, que chegaram com a troca para o Next 16. O código
      // que elas apontam já existia e funciona; ficam como aviso até ser revisto com calma.
      'react-hooks/purity': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      // As recargas completas são de propósito (sessão expirada, restauração de backup).
      '@next/next/no-location-assign-relative-destination': 'off',
    },
  },
]

export default config
