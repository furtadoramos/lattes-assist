# Lattes Assist v1.7 — notas da versão

Data de lançamento: 16 de agosto de 2026.

## Principais mudanças

- autenticação multiusuário antes da importação do XML;
- sincronização em nuvem por usuário com RLS no Supabase;
- cofre de nuvem criptografado no navegador, incluindo XML/XSD, estado curricular, fila, OCR, documentos e arquivos originais;
- backups locais exclusivamente criptografados, com confirmação de senha na exportação e redigitação na restauração;
- restauração local transacional com rollback;
- recuperação do cofre remoto com validação própria de schema e aplicação transacional;
- prospecção externa por Crossref, DataCite, OpenAlex e ORCID, com referência manual segura para ResearchGate e outros links;
- classificação automática e reclassificação manual de produções;
- fila de atualização transformada em seção própria e organizada por categorias/anos;
- menu lateral hierarquizado segundo o fluxo natural de trabalho e com rolagem própria em desktop;
- perfil da conta no topo da barra lateral, com acesso ao cofre e logout persistente;
- apresentação unificada de tipos e datas;
- recuperação de encoding/mojibake na Atualização Assistida;
- service worker com estratégia de atualização que reduz persistência de interface antiga em cache.

## Validações de lançamento

- exportação e restauração de backup normal e criptografado testadas;
- arquivo inválido rejeitado sem perda do estado local;
- cofre criptografado confirmado no backend, com remoção dos snapshots curriculares legados não criptografados;
- senha incorreta do cofre rejeitada sem aplicação dos dados;
- recuperação do cofre com senha correta concluída sem erros;
- Atualização Assistida validada visualmente sem caracteres corrompidos;
- regressão automatizada final inclui sintaxe JavaScript, manifesto, módulos, restauração atômica, cofre, perfil/logout, rolagem lateral, cache, conflitos e exposição acidental de segredos.

## Limitação conhecida do plano Supabase

A proteção contra senhas vazadas via HaveIBeenPwned permanece indisponível no plano atual, pois o próprio Supabase a oferece somente em planos Pro ou superiores. Isso não afeta a criptografia ponta a ponta do conteúdo curricular/documental do cofre.
