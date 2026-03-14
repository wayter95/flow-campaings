const activityLabels: Record<string, string> = {
  email_sent: "Email enviado",
  email_opened: "Email aberto",
  email_clicked: "Email clicado",
  email_bounced: "Email bounce",
  form_submitted: "Formulario enviado",
  tag_added: "Tag adicionada",
  tag_removed: "Tag removida",
  contact_created: "Contato criado",
  unsubscribed: "Descadastrado",
};

export function getActivityLabel(type: string): string {
  return activityLabels[type] || type;
}
