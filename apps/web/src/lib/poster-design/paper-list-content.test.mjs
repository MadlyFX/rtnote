import { expect, test } from 'bun:test';
import { POSTER_DESIGN_TEMPLATES, createPosterDocument } from '@rtnote/shared';
import {
  paperListCurrentCopy,
  paperListSampleCopy,
  paperListSelectionCopy,
  parsePaperListRow,
  posterTemplateSampleCopy,
  posterTemplateSelectionCopy,
} from './paper-list-content';
import { PAPER_LIST_SUBTITLE_LABEL_ZH_CN } from './template-sample-copy.zh-CN';

const starter = { title: 'Write your title', subtitle: 'Turn ideas into something worth sharing', badge: '' };
const source = () => ({ ...createPosterDocument(starter.title, starter.subtitle), copy: starter });

test('selecting the list template on a fresh poster seeds two complete entries', () => {
  const copy = paperListSelectionCopy(source(), starter, true, starter);
  expect(copy).toEqual(paperListSampleCopy(true));
  expect(copy.subtitle.split('\n\n')).toHaveLength(2);
  expect(copy.subtitle.split('\n\n').every(entry => entry.split('\n').length === 4)).toBe(true);
});

test('custom text and imported notes never receive sample content', () => {
  for (const copy of [{ ...starter, title: 'My title' }, { ...starter, subtitle: 'My body' }, { ...starter, badge: 'My badge' }]) {
    expect(paperListSelectionCopy(source(), copy, true, starter)).toEqual(copy);
  }
  expect(paperListSelectionCopy({ ...source(), sourceMemoId: 'memo' }, starter, true, starter)).toEqual(starter);
  expect(paperListSelectionCopy(source(), starter, true)).toEqual(starter);
});

test('template reapplication reads edited row text instead of stale copy', () => {
  const document = source();
  document.templateId = 'paper-list';
  const text = document.elements.find(element => element.type === 'text');
  document.elements = [
    { ...text, id: 'design_2', name: 'paper-list:row:0:heading', text: 'My heading', sourceText: 'My heading' },
    { ...text, id: 'design_3', name: 'paper-list:row:0:body', text: 'Edited body', sourceText: 'Edited body' },
    { ...text, id: 'design_4', name: 'paper-list:row:1:heading', text: 'Second item', sourceText: undefined },
  ];
  expect(paperListCurrentCopy(document, starter).subtitle).toBe('My heading\nEdited body\n\nSecond item');
  expect(paperListCurrentCopy({ ...document, templateId: 'folio' }, starter)).toEqual(starter);
});


test('row subtitles are explicit and ordinary body lines keep their meaning', () => {
  // The Chinese sample labels its subtitle row with the Chinese label and a full-width colon.
  expect(parsePaperListRow(`Book title\n${PAPER_LIST_SUBTITLE_LABEL_ZH_CN}：22 sequences\nSetting：body`)).toEqual({ heading: 'Book title', subtitle: '22 sequences', body: 'Setting：body' });
  expect(parsePaperListRow('Book\nSubtitle: A second level\nBody')).toEqual({ heading: 'Book', subtitle: 'A second level', body: 'Body' });
  expect(parsePaperListRow('Old heading\nFirst paragraph\nSecond paragraph')).toEqual({ heading: 'Old heading', subtitle: undefined, body: 'First paragraph\nSecond paragraph' });
});

test('edited row subtitles survive save and reapply alongside the body', () => {
  const document = source();
  document.templateId = 'paper-list';
  const text = document.elements.find(element => element.type === 'text');
  document.elements = [
    { ...text, id: 'design_1', name: 'paper-list:row:0:heading', text: 'Book title', sourceText: undefined },
    { ...text, id: 'design_2', name: 'paper-list:row:0:subtitle', text: 'Edited subtitle', sourceText: 'Edited subtitle' },
    { ...text, id: 'design_3', name: 'paper-list:row:0:body', text: 'Body', sourceText: undefined },
  ];
  const copy = paperListCurrentCopy(document, paperListSampleCopy(true));
  expect(parsePaperListRow(copy.subtitle)).toEqual({ heading: 'Book title', subtitle: 'Edited subtitle', body: 'Body' });
});


test('the previous unedited example gains subtitles without upgrading custom paragraphs', () => {
  const sample = paperListSampleCopy(true);
  const previous = { ...sample, subtitle: sample.subtitle.replace(new RegExp(String.raw`\n${PAPER_LIST_SUBTITLE_LABEL_ZH_CN}：[^\n]*\n`, 'g'), '\n') };
  const document = { ...source(), templateId: 'paper-list' };
  expect(paperListSelectionCopy(document, previous, true)).toEqual(sample);
  const edited = { ...previous, subtitle: previous.subtitle + 'My addition' };
  expect(paperListSelectionCopy(document, edited, true)).toEqual(edited);
});


test('independent paragraphs reconstruct in order and retain edits across template changes', () => {
  const document = { ...source(), templateId: 'paper-list' };
  const text = document.elements.find(element => element.type === 'text');
  document.elements = [
    { ...text, id: 'p2', name: 'paper-list:row:0:paragraph:2', text: 'Third paragraph', sourceText: undefined },
    { ...text, id: 'head', name: 'paper-list:row:0:heading', text: 'Book title', sourceText: undefined },
    { ...text, id: 'p1', name: 'paper-list:row:0:paragraph:1', text: 'Edited second paragraph', sourceText: 'Edited second paragraph' },
    { ...text, id: 'body', name: 'paper-list:row:0:body', text: 'First paragraph', sourceText: undefined },
  ];
  expect(paperListCurrentCopy(document, starter).subtitle).toBe('Book title\nFirst paragraph\nEdited second paragraph\nThird paragraph');
  document.elements = document.elements.filter(element => element.id !== 'body');
  expect(paperListCurrentCopy(document, starter).subtitle).toBe('Book title\nEdited second paragraph\nThird paragraph');
});

test('paragraph lead-ins follow current wording and leave other templates alone', async () => {
  const { paperListParagraphStyles } = await import('./paper-list-content');
  const paragraph = { type: 'text', name: 'paper-list:row:0:body', text: 'Core: body' };
  const styles = paperListParagraphStyles(paragraph);
  expect(Object.keys(styles[0])).toHaveLength(5);
  expect(styles[0][4].fontWeight).toBe('bold');
  expect(paperListParagraphStyles({ ...paragraph, text: 'A new body without a lead-in' })).toBeUndefined();
  expect(paperListParagraphStyles({ ...paragraph, name: 'ordinary-body' })).toBeUndefined();
  expect(paperListParagraphStyles({ ...paragraph, name: 'paper-list:row:0:paragraph:1', text: 'Twist：new content' })[0][3].fontWeight).toBe('bold');
});

test('every catalog template has distinct bilingual initial sample copy tailored to its structure', () => {
  const zhTitles = new Set();
  const enTitles = new Set();
  for (const template of POSTER_DESIGN_TEMPLATES) {
    const zh = posterTemplateSampleCopy(template.id, true);
    const en = posterTemplateSampleCopy(template.id, false);
    expect(zh.title.trim().length).toBeGreaterThan(0);
    expect(zh.subtitle.trim().length).toBeGreaterThan(0);
    expect(en.title.trim().length).toBeGreaterThan(0);
    expect(en.subtitle.trim().length).toBeGreaterThan(0);
    zhTitles.add(zh.title);
    enTitles.add(en.title);
  }
  expect(zhTitles.size).toBe(POSTER_DESIGN_TEMPLATES.length);
  expect(enTitles.size).toBe(POSTER_DESIGN_TEMPLATES.length);
  expect(posterTemplateSampleCopy('compare', true).subtitle).toContain('|');
  expect(posterTemplateSampleCopy('brush', true).subtitle.split('、')).toHaveLength(3);
  expect(posterTemplateSampleCopy('bento', true).subtitle.split('、')).toHaveLength(3);
  expect(posterTemplateSampleCopy('notes', true).subtitle.split('\n')).toHaveLength(3);
});

test('browsing templates in unedited state switches sample copy while preserving user edits', () => {
  const folioDoc = { ...source(), templateId: 'folio', copy: posterTemplateSampleCopy('folio', true) };
  // Switching from untouched folio -> paper-list -> brush -> chat updates to each template's sample copy
  const toPaperList = posterTemplateSelectionCopy(folioDoc, folioDoc.copy, 'paper-list', true, starter);
  expect(toPaperList).toEqual(posterTemplateSampleCopy('paper-list', true));

  const paperListDoc = { ...source(), templateId: 'paper-list', copy: toPaperList };
  const toBrush = posterTemplateSelectionCopy(paperListDoc, paperListDoc.copy, 'brush', true, starter);
  expect(toBrush).toEqual(posterTemplateSampleCopy('brush', true));

  const brushDoc = { ...source(), templateId: 'brush', copy: toBrush };
  const toChat = posterTemplateSelectionCopy(brushDoc, brushDoc.copy, 'chat', true, starter);
  expect(toChat).toEqual(posterTemplateSampleCopy('chat', true));

  // Once the user edits any field, switching templates preserves their custom copy
  const userEdited = { ...toChat, title: 'Custom title' };
  const chatDoc = { ...source(), templateId: 'chat', copy: userEdited };
  expect(posterTemplateSelectionCopy(chatDoc, userEdited, 'folio', true, starter)).toEqual(userEdited);
  expect(posterTemplateSelectionCopy(chatDoc, userEdited, 'paper-list', true, starter)).toEqual(userEdited);
});

test('edited checklist and compare items reconstruct into subtitle copy', () => {
  const text = source().elements.find(element => element.type === 'text');
  const bentoDoc = {
    ...source(),
    templateId: 'bento',
    copy: posterTemplateSampleCopy('bento', true),
    elements: [
      { ...text, id: 'item0', name: 'poster:item:0', text: 'Review the goal', sourceText: 'Review the goal' },
      { ...text, id: 'item1', name: 'poster:item:1', text: 'Analyze key data', sourceText: 'Analyze key data' },
      { ...text, id: 'item2', name: 'poster:item:2', text: 'Plan next steps', sourceText: 'Plan next steps' },
    ],
  };
  const updatedBento = paperListCurrentCopy(bentoDoc, bentoDoc.copy);
  expect(updatedBento.subtitle).toBe('Review the goal、Analyze key data、Plan next steps');
  expect(posterTemplateSelectionCopy(bentoDoc, updatedBento, 'folio', true, starter)).toEqual(updatedBento);

  const compareDoc = {
    ...source(),
    templateId: 'compare',
    copy: posterTemplateSampleCopy('compare', true),
    elements: [
      { ...text, id: 'c0', name: 'poster:compare:0', text: 'Before: long and vague', sourceText: 'Before: long and vague' },
      { ...text, id: 'c1', name: 'poster:compare:1', text: 'After: straight to the point', sourceText: 'After: straight to the point' },
    ],
  };
  const updatedCompare = paperListCurrentCopy(compareDoc, compareDoc.copy);
  expect(updatedCompare.subtitle).toBe('Before: long and vague | After: straight to the point');
  expect(posterTemplateSelectionCopy(compareDoc, updatedCompare, 'folio', true, starter)).toEqual(updatedCompare);
});
