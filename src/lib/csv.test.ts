import { describe, expect, it } from 'vitest'
import { paraCSV } from './csv'

describe('paraCSV', () => {
  it('neutraliza texto que o Excel leria como fórmula, mas não números', () => {
    const csv = paraCSV([['=1+1', '@soma', '-12,50', '+3', 'Mercado', -5, '-cmd|x']])
    expect(csv).toBe("﻿'=1+1;'@soma;-12,50;+3;Mercado;-5;'-cmd|x\r\n")
  })
})
