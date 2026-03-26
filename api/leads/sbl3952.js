export default async function handler(req, res) {
  // CORS Preflight handling
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(200).end();
    return;
  }

  // Set CORS headers for actual requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  const {
    nome,
    email,
    telefone,
    empresa,
    cargo,
    tipoOperacao,
    quantidade,
    mensagem,
    receberComunicacoes
  } = req.body;

  // Basic validation for required fields
  if (!nome || !email || !telefone || !empresa || !tipoOperacao || !quantidade) {
    console.error('Validation Error: Missing required fields', { nome, email, telefone, empresa, tipoOperacao, quantidade });
    return res.status(400).json({ status: 'error', message: 'Campos obrigatórios faltando.' });
  }

  // Split nome into firstname and lastname for HubSpot
  const nameParts = nome.split(' ');
  const firstname = nameParts[0];
  const lastname = nameParts.slice(1).join(' ') || '';

  try {
    const hubspotPayload = {
      properties: {
        firstname: firstname,
        lastname: lastname,
        email: email,
        phone: telefone,
        company: empresa,
        jobtitle: cargo || 'Não informado',
        tipo_operacao: tipoOperacao,
        quantidade_solicitada: quantidade.toString(),
        mensagem_lp: mensagem || 'Sem mensagem',
        receber_comunicacoes: receberComunicacoes ? 'Sim' : 'Não',
        lifecyclestage: 'lead',
        hs_lead_status: 'New'
      }
    };

    const hubspotResponse = await fetch(
      'https://api.hubapi.com/crm/v3/objects/contacts',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.HUBSPOT_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(hubspotPayload)
      }
    );

    if (!hubspotResponse.ok) {
      const errorText = await hubspotResponse.text();
      console.error(`HubSpot API Error: ${hubspotResponse.status} - ${errorText}`);
      return res.status(hubspotResponse.status).json({
        status: 'error',
        message: `Erro ao enviar dados para o HubSpot: ${errorText}`
      });
    }

    const hubspotData = await hubspotResponse.json();
    console.log('Lead successfully sent to HubSpot:', hubspotData.id);

    return res.status(200).json({
      status: 'success',
      message: 'Sua solicitação foi enviada com sucesso! Em breve entraremos em contato.',
      leadId: hubspotData.id
    });

  } catch (error) {
    console.error('Server Error:', error);
    return res.status(500).json({ status: 'error', message: 'Erro interno do servidor ao processar sua solicitação.' });
  }
}
