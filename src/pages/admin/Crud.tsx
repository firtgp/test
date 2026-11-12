import {useState, type ReactNode} from 'react';
import {z} from 'zod';
import {fromZonedTime, formatInTimeZone} from 'date-fns-tz';
import {AlertDialog} from '@astryxdesign/core/AlertDialog';
import {Banner} from '@astryxdesign/core/Banner';
import {Button} from '@astryxdesign/core/Button';
import {Dialog, DialogHeader} from '@astryxdesign/core/Dialog';
import {HStack} from '@astryxdesign/core/HStack';
import {Layout, LayoutContent, LayoutFooter} from '@astryxdesign/core/Layout';
import {Selector} from '@astryxdesign/core/Selector';
import {Switch} from '@astryxdesign/core/Switch';
import {Table} from '@astryxdesign/core/Table';
import {Text} from '@astryxdesign/core/Text';
import {TextArea} from '@astryxdesign/core/TextArea';
import {TextInput} from '@astryxdesign/core/TextInput';
import {VStack} from '@astryxdesign/core/VStack';
import {useNotify, useSettings} from '../../app/hooks';
import {errorText} from '../../data/types';

export type FieldDef =
  | {name: string; label: string; type: 'text' | 'textarea' | 'number' | 'switch' | 'datetime' | 'date'; description?: string; nullable?: boolean}
  | {name: string; label: string; type: 'select'; options: {value: string; label: string}[]; description?: string; nullable?: boolean};

type Row = {id: string} & Record<string, unknown>;
type Draft = Record<string, unknown>;

const DT_FORMAT = 'yyyy-MM-dd HH:mm';

/** Форма записи. Значения хранятся как введены; в типы БД приводятся при сохранении. */
function toDraft(row: Row, fields: FieldDef[], tz: string): Draft {
  const d: Draft = {...row};
  for (const f of fields) {
    const v = row[f.name];
    if (f.type === 'number') d[f.name] = v == null ? '' : String(v);
    else if (f.type === 'datetime') d[f.name] = v ? formatInTimeZone(String(v), tz, DT_FORMAT) : '';
    else if (f.type === 'switch') d[f.name] = Boolean(v);
    else d[f.name] = v == null ? '' : String(v);
  }
  return d;
}

function fromDraft(draft: Draft, fields: FieldDef[], tz: string): {row: Draft; errors: Record<string, string>} {
  const row: Draft = {...draft};
  const errors: Record<string, string> = {};
  for (const f of fields) {
    const v = draft[f.name];
    if (f.type === 'switch') continue;
    const text = String(v ?? '').trim();
    if (f.type === 'number') {
      if (text === '') row[f.name] = f.nullable ? null : 0;
      else if (!/^-?\d+$/.test(text)) errors[f.name] = 'Введите целое число';
      else row[f.name] = Number(text);
    } else if (f.type === 'datetime') {
      if (text === '') row[f.name] = null;
      else if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text) || Number.isNaN(fromZonedTime(text.replace(' ', 'T'), tz).getTime())) {
        errors[f.name] = 'Формат: ГГГГ-ММ-ДД ЧЧ:ММ, например 2026-12-05 18:00';
      } else row[f.name] = fromZonedTime(text.replace(' ', 'T'), tz).toISOString();
    } else if (f.nullable) {
      row[f.name] = text === '' ? null : text;
    } else {
      row[f.name] = text;
    }
  }
  return {row, errors};
}

export function CrudTab<T extends {id: string}>({
  title, hint, rows, columns, fields, schema, makeNew, save, remove, describe, addLabel, extra,
}: {
  title: string;
  hint?: string;
  rows: T[];
  columns: {key: string; header: string; render: (row: T) => ReactNode}[];
  fields: FieldDef[];
  schema: z.ZodType<T>;
  makeNew: () => T;
  save: (row: T) => Promise<void>;
  remove: (id: string) => Promise<void>;
  describe: (row: T) => string;
  addLabel: string;
  extra?: ReactNode;
}) {
  const settings = useSettings();
  const notify = useNotify();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState<T | null>(null);

  function open(row: T, fresh: boolean) {
    setDraft(toDraft(row as unknown as Row, fields, settings.timezone));
    setIsNew(fresh);
    setErrors({});
    setFormError(null);
  }

  async function submit() {
    if (!draft) return;
    const {row, errors: fieldErrors} = fromDraft(draft, fields, settings.timezone);
    const parsed = schema.safeParse(row);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '');
        if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
      }
    }
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0 || !parsed.success) {
      setFormError('Проверьте отмеченные поля.');
      return;
    }
    setBusy(true);
    try {
      await save(parsed.data);
      notify.ok('Сохранено');
      setDraft(null);
    } catch (e) {
      // Форма остаётся открытой с введёнными данными.
      setFormError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const set = (name: string, value: unknown) => setDraft(d => (d ? {...d, [name]: value} : d));
  const status = (name: string) => (errors[name] ? {type: 'error' as const, message: errors[name]} : undefined);

  return (
    <VStack gap={4}>
      <HStack justify="between" vAlign="center" wrap="wrap" gap={3}>
        <VStack gap={1}>
          <Text type="large" weight="bold">
            {title}
          </Text>
          {hint ? <Text color="secondary">{hint}</Text> : null}
        </VStack>
        <Button label={addLabel} variant="primary" onClick={() => open(makeNew(), true)} />
      </HStack>
      {extra}
      {rows.length === 0 ? (
        <Text color="secondary">Записей пока нет.</Text>
      ) : (
        <Table<T>
          data={rows}
          idKey="id"
          density="compact"
          columns={[
            ...columns.map(c => ({key: c.key, header: c.header, renderCell: (row: T) => <>{c.render(row)}</>})),
            {
              key: '__actions',
              header: 'Действия',
              renderCell: (row: T) => (
                <HStack gap={1}>
                  <Button label="Изменить" variant="ghost" size="sm" onClick={() => open(row, false)} />
                  <Button label="Удалить" variant="ghost" size="sm" onClick={() => setToDelete(row)} />
                </HStack>
              ),
            },
          ]}
        />
      )}

      <Dialog isOpen={draft !== null} onOpenChange={o => !o && setDraft(null)} purpose="form" width={560}>
        {draft ? (
          <Layout
            header={<DialogHeader title={isNew ? addLabel : 'Изменить запись'} onOpenChange={() => setDraft(null)} />}
            content={
              <LayoutContent>
                <VStack gap={4}>
                  {formError ? (
                    <div role="alert">
                      <Banner status="error" title={formError} />
                    </div>
                  ) : null}
                  {fields.map(f => {
                    const common = {key: f.name, label: f.label, description: f.description};
                    if (f.type === 'switch') {
                      return <Switch {...common} value={Boolean(draft[f.name])} onChange={(v: boolean) => set(f.name, v)} />;
                    }
                    if (f.type === 'select') {
                      return (
                        <Selector
                          {...common}
                          options={f.options}
                          value={String(draft[f.name] ?? '')}
                          hasClear={f.nullable}
                          onChange={(v: string | null) => set(f.name, v ?? '')}
                          status={status(f.name)}
                        />
                      );
                    }
                    if (f.type === 'textarea') {
                      return (
                        <TextArea {...common} rows={6} value={String(draft[f.name] ?? '')} onChange={v => set(f.name, v)} status={status(f.name)} />
                      );
                    }
                    return (
                      <TextInput
                        {...common}
                        description={
                          f.type === 'datetime'
                            ? `${f.description ? f.description + ' ' : ''}Формат ГГГГ-ММ-ДД ЧЧ:ММ, время ${settings.timezone_label} (${settings.timezone}).`
                            : f.type === 'date'
                              ? `${f.description ? f.description + ' ' : ''}Формат ГГГГ-ММ-ДД.`
                              : f.description
                        }
                        inputMode={f.type === 'number' ? 'numeric' : undefined}
                        value={String(draft[f.name] ?? '')}
                        onChange={v => set(f.name, v)}
                        status={status(f.name)}
                      />
                    );
                  })}
                </VStack>
              </LayoutContent>
            }
            footer={
              <LayoutFooter>
                <HStack gap={2} hAlign="end">
                  <Button label="Отмена" variant="secondary" onClick={() => setDraft(null)} />
                  <Button label="Сохранить" variant="primary" isLoading={busy} onClick={submit} />
                </HStack>
              </LayoutFooter>
            }
          />
        ) : null}
      </Dialog>

      <AlertDialog
        isOpen={toDelete !== null}
        onOpenChange={o => !o && setToDelete(null)}
        title="Удалить запись?"
        description={toDelete ? `«${describe(toDelete)}» будет удалена без возможности восстановления.` : ''}
        actionLabel="Удалить"
        cancelLabel="Отмена"
        actionVariant="destructive"
        onAction={async () => {
          if (!toDelete) return;
          try {
            await remove(toDelete.id);
            notify.ok('Удалено');
          } catch (e) {
            notify.fail(e);
          } finally {
            setToDelete(null);
          }
        }}
      />
    </VStack>
  );
}
