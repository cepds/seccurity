export function daysUntil(value: string) {
  const today = new Date();
  const target = new Date(`${value}T00:00:00`);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  return Math.ceil((target.getTime() - startOfToday.getTime()) / 86400000);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

export function formatMonthSpan(startValue: string, endValue: string) {
  const start = new Date(`${startValue}T00:00:00`);
  const end = new Date(`${endValue}T00:00:00`);

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const parts: string[] = [];
  if (years > 0) {
    parts.push(years === 1 ? "1 ano" : `${years} anos`);
  }

  if (months > 0) {
    parts.push(months === 1 ? "1 mes" : `${months} meses`);
  }

  return parts.length > 0 ? parts.join(" e ") : "menos de 1 mes";
}

export function buildCountdownCopy(targetDate: string) {
  const delta = daysUntil(targetDate);
  if (delta > 1) {
    return `${delta} dias para ${formatDate(targetDate)}`;
  }

  if (delta === 1) {
    return "Falta 1 dia para a nossa celebracao.";
  }

  if (delta === 0) {
    return "Hoje e o nosso dia especial.";
  }

  return "Esta data linda ja chegou.";
}

export function buildTimeMessage() {
  const hour = new Date().getHours();

  if (hour < 12) {
    return "Bom dia, Sandra. Que o seu dia comece com a mesma delicadeza que voce coloca na vida do Carlos.";
  }

  if (hour < 18) {
    return "Boa tarde, Sandra. Se o dia estiver corrido, este app existe para te lembrar que voce e profundamente amada.";
  }

  return "Boa noite, Sandra. Que voce durma com a certeza de que e o capitulo mais bonito da historia do Carlos.";
}
