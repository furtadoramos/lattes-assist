# Lattes Assist v1.7 RC1

Release candidate congelada em 15/08/2026 para regressão antes de qualquer promoção para a versão pública estável.

## Escopo funcional congelado

- autenticação obrigatória por e-mail/senha via Supabase Auth;
- isolamento local por usuário e RLS no backend;
- importação XML com detecção de encoding, normalização Unicode e correção conservadora de mojibake;
- backup/restauração integral local com criptografia opcional;
- sincronização de análise curricular em nuvem, sem upload automático dos arquivos originais;
- documentos/evidências com PDF/OCR, classificação e reconciliação;
- busca e correção de DOI via Crossref;
- prospecção multi-fonte via Crossref, DataCite, OpenAlex e ORCID;
- OpenAlex e ORCID por Edge Functions autenticadas no Supabase;
- referência externa manual segura para ResearchGate e outras URLs, sem scraping;
- deduplicação de candidatos externos;
- classificação automática de tipo de produção;
- reclassificação manual em resultados DOI/fontes externas e operações elegíveis da fila;
- apresentação de tipo e data, em ordem cronológica decrescente;
- fila organizada por ano, categoria e status, com filtros e remoção individual;
- recuperação de títulos antigos corrompidos por encoding antes da Atualização Assistida;
- Central de Decisão, pacote de Atualização Assistida, XML de auditoria/patch, XSD e diffs.

## Regras de segurança mantidas

- nenhuma senha da Plataforma Lattes/CNPq é solicitada ou armazenada;
- nenhuma service-role key ou secret de ORCID/OpenAlex é exposta no frontend;
- arquivos privados não são versionados no GitHub;
- ResearchGate é aceito apenas como procedência informada pelo usuário; nenhuma automação/scraping da página é executada;
- alterações curriculares continuam assistidas e dependem de conferência humana.

## Checklist de regressão RC1

### Acesso e sessão
- [ ] Criar conta / confirmar e-mail / entrar.
- [ ] Sair e confirmar retorno à tela de autenticação.
- [ ] Confirmar bloqueio de XML antes do login.
- [ ] Confirmar proteção contra troca de usuário no mesmo espaço local.

### XML e encoding
- [ ] Importar XML real do Lattes.
- [ ] Verificar acentos, cedilha, aspas e travessões.
- [ ] Confirmar ausência de `�`, `Ã`, `Â` e padrões equivalentes nas telas.
- [ ] Conferir especificamente títulos que já apresentaram corrupção de encoding.

### Documentos
- [ ] Inserir PDF com texto.
- [ ] Inserir imagem/PDF digitalizado e executar OCR.
- [ ] Revisar classificação documental.
- [ ] Verificar tipo visível e ordenação por data.
- [ ] Enviar evidência pertinente à fila.

### DOI e fontes externas
- [ ] Buscar DOI no Crossref.
- [ ] Reclassificar uma sugestão DOI e aprová-la.
- [ ] Prospectar Crossref + DataCite + OpenAlex + ORCID.
- [ ] Confirmar deduplicação entre fontes.
- [ ] Confirmar classificação automática e opção Reclassificar.
- [ ] Adicionar candidato externo à fila.
- [ ] Resolver uma referência manual com link + DOI/título.

### Fila e Atualização Assistida
- [ ] Conferir agrupamento por ano, filtros, tipo e status.
- [ ] Reclassificar item elegível da fila.
- [ ] Remover item individual.
- [ ] Gerar pacote de Atualização Assistida.
- [ ] Confirmar que nenhum título apresenta mojibake.
- [ ] Exportar pacote assistido.

### Backup e sincronização
- [ ] Exportar backup sem criptografia.
- [ ] Exportar backup criptografado.
- [ ] Restaurar backup controlado.
- [ ] Salvar análise na nuvem.
- [ ] Recuperar a análise em sessão/dispositivo distinto.
- [ ] Confirmar preservação local dos arquivos originais.

### XML/XSD/diffs
- [ ] Gerar XML de auditoria e patch.
- [ ] Carregar XSD, quando disponível.
- [ ] Reconstruir XML em cenário controlado.
- [ ] Conferir diff visual e semântico.

## Critério de promoção

A RC1 somente deve substituir a v1.6 pública após o checklist acima não revelar regressões bloqueadoras. Qualquer correção em código de produto após este congelamento deve resultar em uma nova release candidate (RC2 ou posterior), em vez de alterar silenciosamente a RC1.
