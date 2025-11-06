import { withContext } from '../logger'

export type OrderItem = { productId: string; quantity: number; price: number; subtotal: number }
export type OrderInfo = { orderId: string; total: number; items: OrderItem[]; createdAt: string }
export type UserInfo = { email: string; name?: string }

function renderOrderHtml(user: UserInfo, order: OrderInfo) {
  const itemsHtml = order.items.map(it => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${it.productId}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center">${it.quantity}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$${it.price.toFixed(2)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">$${it.subtotal.toFixed(2)}</td>
    </tr>
  `).join('')

  return `
  <div style="font-family:Arial,Helvetica,sans-serif;color:#222">
    <h2>Hola ${user.name || user.email}, ¡gracias por tu compra!</h2>
    <p>Confirmación del pedido <b>#${order.orderId}</b></p>
    <p>Fecha: ${new Date(order.createdAt).toLocaleString('es-ES')}</p>
    <table style="border-collapse:collapse;width:100%;max-width:640px">
      <thead>
        <tr>
          <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #555">Producto</th>
          <th style="text-align:center;padding:6px 10px;border-bottom:2px solid #555">Cant.</th>
          <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #555">Precio</th>
          <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #555">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="text-align:right;padding:8px 10px;font-weight:bold">Total</td>
          <td style="text-align:right;padding:8px 10px;font-weight:bold">$${order.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <p style="color:#666;font-size:12px">Este es un correo automático. No respondas a este mensaje.</p>
  </div>
  `
}

function renderOrderText(user: UserInfo, order: OrderInfo) {
  const lines = [
    `Hola ${user.name || user.email}, ¡gracias por tu compra!`,
    `Confirmación del pedido #${order.orderId}`,
    `Fecha: ${new Date(order.createdAt).toLocaleString('es-ES')}`,
    '',
    'Items:'
  ]
  for (const it of order.items) {
    lines.push(`- ${it.productId} x${it.quantity} $${it.price.toFixed(2)} = $${it.subtotal.toFixed(2)}`)
  }
  lines.push('', `Total: $${order.total.toFixed(2)}`)
  return lines.join('\n')
}

async function sendViaSes(from: string, to: string, subject: string, html: string, text: string) {
  const { SESClient, SendEmailCommand } = await import('@aws-sdk/client-ses')
  const client = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' })
  await client.send(new SendEmailCommand({
    Destination: { ToAddresses: [to] },
    Source: from,
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
        Text: { Data: text, Charset: 'UTF-8' }
      }
    }
  }))
}

export async function sendOrderConfirmationEmail(user: UserInfo, order: OrderInfo) {
  const log = withContext({ fn: 'email.sendOrderConfirmation' })
  const provider = (process.env.EMAIL_PROVIDER || 'console').toLowerCase()
  const fromEmail = process.env.FROM_EMAIL || 'no-reply@example.com'
  const subject = `Tu pedido #${order.orderId} fue confirmado`
  const html = renderOrderHtml(user, order)
  const text = renderOrderText(user, order)

  if (provider === 'ses') {
    await sendViaSes(fromEmail, user.email, subject, html, text)
    return
  }

  if (provider === 'smtp') {
    await sendViaSmtp({
      host: process.env.SMTP_HOST || 'localhost',
      port: Number(process.env.SMTP_PORT || 25),
      secure: String(process.env.SMTP_SECURE || 'false').toLowerCase() === 'true',
      auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! } : undefined,
      from: fromEmail,
      to: user.email,
      subject,
      html,
      text
    })
    return
  }

  log.info('email_mock', {
    to: user.email,
    subject,
    preview: text.substring(0, 140) + (text.length > 140 ? '…' : '')
  })
}

type SmtpOptions = {
  host: string
  port: number
  secure: boolean
  auth?: { user: string; pass: string }
  from: string
  to: string
  subject: string
  html: string
  text: string
}

async function sendViaSmtp(opts: SmtpOptions) {
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.createTransport({
    host: opts.host,
    port: opts.port,
    secure: opts.secure,
    auth: opts.auth
  } as any)

  await transporter.sendMail({
    from: opts.from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text
  })
}
