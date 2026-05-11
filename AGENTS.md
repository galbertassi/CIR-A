<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# REGRAS DO PROJETO CIRILA (DCRAA/SMSVR)

- **PLANILHA DE SOBREAVISO:** NUNCA altere o código, layout, cores ou formatação do arquivo `src/app/api/cirila/sobreaviso/route.ts`. Este documento segue um padrão institucional rígido que não deve ser modificado sob nenhuma circunstância, a menos que solicitado explicitamente com uma justificativa de mudança de norma.
- **IDENTIDADE VISUAL:** Todas as etiquetas geradas devem seguir o padrão institucional: CAIXA ALTA, NEGRITO e PRETO.
- **IMUTABILIDADE DA ETIQUETA (RODAPÉ FIXO):** NUNCA altere o código, layout ou formatação do arquivo `src/app/api/cirila/etiqueta/route.ts`. O formato atual (Corpo 100% limpo para colagem manual + Etiqueta fixa no Rodapé) é o padrão definitivo e institucional.
- **REGRA DE PÁGINA ÚNICA (RODAPÉ FIXO):** Se houver anexo automático, ele deve ser centralizado (máx 400x550px) para garantir que a etiqueta (que está no rodapé) permaneça na mesma folha. As margens devem ser sempre 720 DXA em todos os lados.
- **VALIDAÇÃO:** Sempre exija o Hospital de Origem para geração de etiquetas oficiais.
- **LOGIN UI:** O layout da página de login é DEFINITIVO. O logo deve ter exatamente 100px de largura, o título deve ser em CAIXA ALTA (CENTRAL INTELIGENTE DE / REGULAÇÃO AUTOMATIZADA) e a BARRA DE DIALOGO da Cirila deve estar posicionada EXATAMENTE a 30% da base (`bottom: 30%`). ESTA POSIÇÃO É IMUTÁVEL E NUNCA DEVE SER ALTERADA SOB QUALQUER CIRCUNSTÂNCIA.
- **CIRILA ANEXO (SISTEMA DE UPLOAD):** NUNCA altere a rota `/src/app/api/upload/route.ts` ou o componente `src/components/AttachEvolutionModal.tsx` após a estabilização confirmada (Checkpoint: **CIRILA ANEXO**). O padrão de upload via API Route com processamento de Buffer e runtime Node.js é o padrão definitivo e institucional para garantir estabilidade binária.

