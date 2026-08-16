# Lattes Assist v1.7 RC3

Release candidate criada após a validação funcional da RC2 e antes de qualquer promoção para a versão pública estável.

## Objetivos da RC3

1. Reorganizar a navegação segundo o fluxo natural de trabalho.
2. Tornar a Fila uma seção própria e claramente visível no menu lateral.
3. Tornar a criptografia obrigatória em novos backups locais.
4. Exigir redigitação da senha na restauração de backup.
5. Substituir a sincronização curricular não criptografada por um cofre de nuvem cifrado no navegador, incluindo documentos e arquivos originais.

## Navegação processual

A barra lateral passa a ser agrupada e numerada em quatro etapas:

- Entrada e prospecção: Currículo Lattes (XML), Documentos e evidências, Fontes externas e prospecção, Atualizações DOI.
- Análise e decisão: Auditoria, Retrospectiva, Linha do tempo, Identidade, Decisões.
- Preparação da atualização: Fila, Atualização assistida, XSD/XML, Diff XML.
- Conta e sistema: Conta/nuvem/backup e Integrações.

A Fila deixa de ficar subordinada à antiga tela de Sincronização e passa a possuir painel próprio, mantendo exportação, limpeza, filtros, reclassificação e remoção individual.

## Backup local

- novos backups são sempre criptografados;
- senha mínima de 12 caracteres na interface;
- confirmação obrigatória da senha na exportação;
- a senha não é armazenada;
- a restauração aceita somente contêiner de backup criptografado;
- a senha deve ser redigitada para cada operação de restauração;
- backups criptografados anteriores continuam compatíveis quando informam o número de iterações do KDF;
- permanece o mecanismo transacional e de rollback introduzido na RC2.

## Cofre criptografado da nuvem

O conteúdo curricular deixa de ser salvo em texto legível no snapshot remoto. A RC3 usa:

- Supabase Auth para autenticação;
- RLS para isolamento por usuário;
- bucket privado `lattes-assist-vaults`;
- tabela `user_cloud_vaults` contendo somente o ponteiro opaco para a versão atual do cofre;
- PBKDF2-SHA-256 com salt aleatório e 310.000 iterações para derivação da chave;
- AES-GCM para criptografia autenticada;
- blocos de 8 MB para documentos e manifesto, compatíveis com o limite de objeto do plano Free;
- senha do cofre criada pelo usuário, nunca enviada ao Supabase e nunca armazenada pelo aplicativo.

São cifrados antes do upload:

- estado curricular interpretado;
- auditorias, decisões e fila;
- configurações curriculares;
- XML original e XSD carregado;
- metadados de documentos e texto OCR;
- documentos e arquivos originais armazenados no IndexedDB.

Metadados mínimos necessários à autenticação e ao roteamento técnico do cofre — como conta Supabase, UUID do usuário, salt/KDF, IVs, caminhos opacos dos blocos e ponteiro do cofre — não constituem o conteúdo curricular cifrado e permanecem disponíveis ao serviço para que autenticação, RLS e recuperação funcionem.

## Migração do armazenamento remoto legado

Após um primeiro salvamento criptografado bem-sucedido:

- o ponteiro do novo cofre é registrado;
- os registros legados do próprio usuário em `user_snapshots` e `user_preferences` são removidos;
- se a remoção do conteúdo legado falhar, o aplicativo não declara o salvamento como seguro e tenta reverter o ponteiro;
- versões criptografadas antigas do cofre são removidas após a ativação da nova versão; eventual falha nessa limpeza não expõe o conteúdo, pois a versão anterior permanece cifrada.

## Infraestrutura Supabase

Foi criada a tabela `public.user_cloud_vaults` com RLS e políticas SELECT/INSERT/UPDATE/DELETE limitadas ao próprio usuário. Foi criado o bucket privado `lattes-assist-vaults`, com políticas de Storage que permitem ao usuário operar apenas em objetos cujo primeiro diretório corresponde ao seu `auth.uid()`.

O Security Advisor continua apontando exclusivamente `Leaked Password Protection Disabled`, limitação conhecida do plano atual, pois o Supabase informou que a proteção HaveIBeenPwned é disponibilizada apenas em planos Pro ou superiores.

## Regressão automatizada

A suíte RC3 verifica:

- sintaxe de todos os 30 módulos JavaScript;
- manifesto PWA;
- carregamento e cache dos 30 módulos;
- recursos herdados de encoding, DOI, ORCID, OpenAlex e ResearchGate manual;
- restauração local atômica da RC2;
- nova navegação e painel próprio da Fila;
- backup obrigatoriamente criptografado e campos separados de confirmação/restauração;
- presença do cofre criptografado, chunking, criptografia e descriptografia;
- remoção de snapshots legados após salvamento seguro;
- ausência de marcadores de conflito;
- guarda contra exposição de chaves secret/service-role no frontend.

## Testes manuais obrigatórios antes da promoção

- [ ] Conferir visualmente a nova hierarquia do menu e o painel Fila.
- [ ] Exportar novo backup RC3 e confirmar que não existe opção sem criptografia.
- [ ] Restaurar o backup apenas após redigitar a senha.
- [ ] Tentar senha incorreta e confirmar que o estado local não é alterado.
- [ ] Salvar cofre criptografado com pelo menos um documento original.
- [ ] Sair da conta, recarregar a página e entrar novamente.
- [ ] Recuperar o cofre com a senha e confirmar retorno do XML, estado, fila, OCR e arquivo original.
- [ ] Confirmar que senha incorreta do cofre não modifica o estado local.
- [ ] Confirmar no Supabase que o snapshot legado do usuário foi removido após o primeiro salvamento criptografado.
- [ ] Fazer regressão visual final buscando mojibake em Atualização Assistida.

A RC3 não deve substituir a versão pública até que estes testes sejam concluídos e haja autorização explícita para promoção.