-- The RTNote rename changed the welcome seed text in 0001 and 0071 but kept
-- the content hash computed from the old text, so fresh installations store a
-- hash that does not match their welcome note. Correct it for the exact,
-- untouched seed only; any edited note already has a recomputed hash.
UPDATE memo_contents
SET content_hash = '189b5908aab07c9d43a58954ab8cf5d87a7f213c8895d381cbed1af5e1f45839'
WHERE memo_id = 'memo_welcome'
  AND content_hash = '30fae5a337f8b9709505c5ab00ee921410b78632c14f4b7577c88aea0f9fc390'
  AND content_markdown = '## 欢迎来到 RTNote' || char(10) || '' || char(10) || '这是第一条 RTNote 笔记，三栏、边缘、Agent-ready。' || char(10) || '' || char(10) || '接下来可以创建笔记本、写笔记、搜索内容，并把多条笔记合并成一条新的长期笔记。'
  AND content_json = '{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"欢迎来到 RTNote"}]},{"type":"paragraph","content":[{"type":"text","text":"这是第一条 RTNote 笔记，三栏、边缘、Agent-ready。"}]},{"type":"paragraph","content":[{"type":"text","text":"接下来可以创建笔记本、写笔记、搜索内容，并把多条笔记合并成一条新的长期笔记。"}]}]}';
