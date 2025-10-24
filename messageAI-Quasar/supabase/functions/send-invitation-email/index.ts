// Follow this setup guide to integrate the Deno runtime into Supabase Edge Functions:
// https://supabase.com/docs/guides/functions/deno

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { email, token, role, gymId } = await req.json()

    if (!email || !token || !role || !gymId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // TODO: Integrate with email service (SendGrid, Resend, etc.)
    // For now, just log and return success
    console.log('Invitation email would be sent to:', email)
    console.log('Invitation link:', `${Deno.env.get('FRONTEND_URL')}/signup?invite=${token}`)

    // Example SendGrid integration (uncomment when ready):
    /*
    const sendgridApiKey = Deno.env.get('SENDGRID_API_KEY')
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sendgridApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{
          to: [{ email }],
          subject: `You're invited to join our gym!`
        }],
        from: {
          email: 'noreply@yourgym.com',
          name: 'Gym Team'
        },
        content: [{
          type: 'text/html',
          value: `
            <h2>You've been invited!</h2>
            <p>You've been invited to join as a ${role}.</p>
            <p><a href="${Deno.env.get('FRONTEND_URL')}/signup?invite=${token}">Click here to accept invitation</a></p>
            <p>This invitation expires in 7 days.</p>
          `
        }]
      })
    })
    */

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Invitation email sent (simulated)',
        invitationLink: `${Deno.env.get('FRONTEND_URL') || 'http://localhost:9000'}/signup?invite=${token}`
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

