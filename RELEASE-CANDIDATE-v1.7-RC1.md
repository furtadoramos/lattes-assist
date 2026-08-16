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

## Verificações automatizadas concluídas

- sintaxe de todos os módulos JavaScript;
- validade do manifesto PWA;
- presença e carregamento dos 27 módulos da aplicação;
- cache dos 27 módulos pelo service worker;
- presença dos recursos críticos de autenticação, encoding, reclassificação, cronologia, ORCID/OpenAlex e referência externa manual;
- ausência de marcadores de conflito Git;
- guarda estática contra exposição de service-role/secret keys no frontend.

## Verificações funcionais confirmadas em logs

- login por e-mail/senha concluído com sucesso;
- logout concluído com sucesso;
- Edge Function ORCID respondeu HTTP 200 em chamada real;
- Edge Function OpenAlex respondeu HTTP 200 em chamada real.

## Bloqueador antes de produção

O Security Advisor do Supabase aponta `Leaked Password Protection Disabled`. A proteção contra senhas vazadas deve ser habilitada em Authentication > Providers > Email / configurações de senha antes da promoção para produção, quando disponível no plano do projeto. O Supabase informa que esse recurso consulta a base Pwned Passwords do Have I Been Pwned e está disponível em planos Pro ou superiores.

Enquanto esse aviso permanecer ativo, a RC1 pode ser testada, mas não deve substituir a v1.6 pública.

## Checklist de regressão RC1

### Acesso e sessão
- [x] Criar conta / confirmar e-mail / entrar — fluxo já exercitado na beta.
- [x] Sair e confirmar retorno à tela de autenticação — fluxo já exercitado na beta.
- [x] Confirmar bloqueio de XML antes do login — validado funcionalmente na beta.
- [ ] Confirmar proteção contra troca de usuário no mesmo espaço local com segunda conta distinta.

### XML e encoding
- [x] Importar XML real do Lattes.
- [x] Verificar acentos, cedilha, aspas e travessões.
- [x] Conferir especificamente títulos que já apresentaram corrupção de encoding.
- [ ] Fazer uma última varredura visual completa buscando `�`, `Ã`, `Â` e padrões equivalentes em todas as telas após recarregar a RC.

### Documentos
- [x] Inserir e processar documentos/evidências na beta.
- [x] Revisar classificação documental.
- [x] Verificar tipo visível e ordenação por data.
- [x] Enviar evidência pertinente à fila.
- [ ] Repetir um teste OCR em documento digitalizado diretamente na RC congelada.

### DOI e fontes externas
- [x] Buscar DOI no Crossref.
- [x] Prospectar Crossref + DataCite + OpenAlex + ORCID.
- [x] Confirmar funcionamento real de ORCID e OpenAlex no backend.
- [x] Confirmar classificação automática e opção Reclassificar.
- [x] Adicionar candidato externo à fila.
- [x] Resolver referência manual com link + DOI/título.
- [ ] Repetir uma reclassificação de DOI e uma reclassificação de fonte externa diretamente na RC congelada.

### Fila e Atualização Assistida
- [x] Conferir agrupamento por ano, filtros, tipo e status.
- [x] Reclassificar item elegível da fila.
- [x] Remover item individual.
- [x] Gerar pacote de Atualização Assistida.
- [x] Corrigir o caso persistente de mojibake na Atualização Assistida.
- [ ] Exportar novamente o pacote assistido a partir da RC congelada e verificar o arquivo produzido.

### Backup e sincronização
- [ ] Exportar backup sem criptografia na RC.
- [ ] Exportar backup criptografado na RC.
- [ ] Restaurar backup controlado na RC.
- [ ] Salvar análise na nuvem e recuperar em sessão/dispositivo distinto.
- [ ] Confirmar preservação local dos arquivos originais após a recuperação remota.

### XML/XSD/diffs
- [ ] Gerar XML de auditoria e patch na RC.
- [ ] Carregar XSD, quando disponível.
- [ ] Reconstruir XML em cenário controlado.
- [ ] Conferir diff visual e semântico.

## Critério de promoção

A RC1 somente deve substituir a v1.6 pública após: (1) o bloqueador de senhas vazadas ser resolvido ou conscientemente tratado conforme o plano do Supabase; e (2) os itens restantes do checklist não revelarem regressões bloqueadoras. Qualquer correção em código de produto após este congelamento deve resultar em uma nova release candidate (RC2 ou posterior), em vez de alterar silenciosamente a RC1.
