import { applyMutation, deleteEntity, resetDemo } from './api';
import type { ActionDto } from './contract';
import { confirmDialog } from './dialog';
import { pushToast } from './toast';
import type { Route } from './use-screen';

export interface RuntimeCtx {
  navigate: (to: Route) => void;
  goBack: () => void;
  refresh: () => void;
}

async function runMutation(reply: Awaited<ReturnType<typeof applyMutation>>, ctx: RuntimeCtx) {
  if (reply.ok && reply.toast) pushToast(reply.toast);
  if (reply.next) await runAction(reply.next, ctx);
}

// Клиент не знает домен: он просто исполняет действие из схемы.
// Даже подтверждение удаления и следующий шаг после мутации придумал бэкенд.
export async function runAction(a: ActionDto, ctx: RuntimeCtx): Promise<void> {
  switch (a.type) {
    case 'navigate':
      ctx.navigate({ screen: a.screen, query: a.query });
      break;
    case 'back':
      ctx.goBack();
      break;
    case 'refresh':
      ctx.refresh();
      break;
    case 'delete': {
      const agreed = await confirmDialog({
        title: 'Подтверждение',
        message: a.confirm ?? 'Удалить? Отменить это действие нельзя.',
        okLabel: 'Удалить',
        cancelLabel: 'Отмена',
        danger: true,
      });
      if (!agreed) return;
      await runMutation(await deleteEntity(a.entity, a.entityId), ctx);
      break;
    }
    case 'reset':
      await runMutation(await resetDemo(), ctx);
      break;
    case 'apply':
      await runMutation(
        await applyMutation({ op: a.op, entity: a.entity, id: a.entityId ?? null, delta: a.delta, set: a.set }),
        ctx,
      );
      break;
  }
}