# Lattes Assist v1.8

Data de lançamento: 22/08/2026

## Destaques

- Integração com Publish or Perish por arquivos JSON, JSON Lines, CSV e RefMan/RIS.
- Importação bibliográfica com preservação separada de métricas bibliométricas, evitando misturá-las aos campos do Currículo Lattes.
- Reconciliação dos registros PoP com o XML Lattes e com as demais fontes externas já suportadas.
- Exportação RIS em três escopos: somente registros Publish or Perish, candidatos externos consolidados multifuente e Fila de atualização.
- Round-trip Publish or Perish → Lattes Assist → RIS → Publish or Perish validado com dados reais.
- Cardinalidade do corpus PoP preservada no teste real: 35 registros importados e 35 registros retornados no RIS PoP-only.
- Correspondência entre os 35 registros PoP e o Currículo Lattes conferida manualmente e considerada correta.

## Curadoria de fontes externas

- Novo botão `Excluir` em cada candidato de Fontes Externas e Prospecção.
- Exclusão persistente por DOI e/ou título+ano para evitar que registros descartados reapareçam em novas importações ou prospecções.
- Se um candidato excluído já estiver na Fila, a operação vinculada também pode ser removida de forma confirmada para evitar atualização órfã.
- Novo item lateral `3.1 Gerenciar excluídos`, com painel próprio, contagem e restauração de registros.
- Registros restaurados voltam a poder ser considerados, sem serem automaticamente adicionados à Fila.

## Fila

- Ação de remoção explicitada como `Remover da Fila`, distinguindo retirada da atualização atual de exclusão persistente nas Fontes Externas.
- Reclassificação, ordenação, filtros, encoding e Atualização Assistida preservados.

## Segurança e persistência

- Cofre criptografado ponta a ponta preservado.
- Backups locais continuam exclusivamente criptografados.
- Exclusões persistentes fazem parte das configurações do estado e, portanto, acompanham o cofre e os backups do usuário.
- Restauração transacional e rollback permanecem ativos.

## Validação

Foram aprovados testes automatizados de sintaxe JavaScript, manifesto PWA, completude de módulos, parsers Publish or Perish, exportação RIS, fingerprints de exclusão, recursos críticos existentes, ausência de conflitos e guarda contra exposição de segredos.

Testes manuais aprovados incluem: importação real do PoP, reconciliação com o Lattes, round-trip RIS consolidado, round-trip RIS PoP-only, cardinalidade 35 → 35, exclusão/restauração em Fontes Externas, presença de `3.1 Gerenciar excluídos` no menu e remoção explícita de itens da Fila.

## Limitação conhecida não bloqueadora

A proteção HaveIBeenPwned/Leaked Password Protection do Supabase permanece indisponível no plano atual, pois requer plano Pro ou superior.
