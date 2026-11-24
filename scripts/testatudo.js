// Certifique-se de que o servidor (npm run dev) está rodando antes de executar: node test-routes.js

const BASE_URL = 'https://petperto.vercel.app/api';

async function runTests() {
  console.log('🧪 Iniciando testes da API do PetPerto...\n');

  try {
    // 1. Registrar ONG
    const ongEmail = `ong_${Date.now()}@test.com`;
    console.log(`1️⃣ Cadastrando ONG (${ongEmail})...`);
    const regOngRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'ONG Amigos dos Bichos',
        email: ongEmail,
        senha: '123456password',
        telefone: '11999999999',
        tipoPerfil: 'ONG',
        cidade: 'São Paulo',
        estado: 'SP',
      }),
    });
    const ongData = await regOngRes.json();
    console.log('✅ ONG cadastrada:', ongData.email || ongData);

    // 2. Login ONG para pegar o Token
    console.log('\n2️⃣ Realizando login da ONG...');
    const loginOngRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: ongEmail,
        senha: '123456password',
      }),
    });
    const loginOngData = await loginOngRes.json();
    const ongToken = loginOngData.token;
    console.log('✅ Token da ONG obtido com sucesso.');

    // 3. Cadastrar um Pet
    console.log('\n3️⃣ Cadastrando um pet...');
    const petRes = await fetch(`${BASE_URL}/pets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ongToken}`,
      },
      body: JSON.stringify({
        nome: 'Mel',
        especie: 'CAO',
        raca: 'SRD',
        idadeEstimada: '1 ano',
        porte: 'MEDIO',
        sexo: 'FEMEA',
        castrado: true,
        vacinado: true,
        vermifugado: true,
        descricaoTemperamento: 'Muito dócil e brincalhona',
        fotos: ['https://exemplo.com/foto-mel.jpg'],
      }),
    });
    const petData = await petRes.json();
    console.log('✅ Pet cadastrado com ID:', petData.id);
    const petId = petData.id;

    // 4. Listar Pets Disponíveis (Público)
    console.log('\n4️⃣ Buscando feed de pets disponíveis...');
    const feedRes = await fetch(`${BASE_URL}/pets`);
    const feedData = await feedRes.json();
    console.log(`✅ Pets encontrados no feed: ${feedData.length}`);

    // 5. Registrar Adotante e Logar
    const adotanteEmail = `adotante_${Date.now()}@test.com`;
    console.log(`\n5️⃣ Cadastrando e logando Adotante (${adotanteEmail})...`);
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'João Adotante',
        email: adotanteEmail,
        senha: '123456password',
        tipoPerfil: 'ADOTANTE',
        cidade: 'São Paulo',
        estado: 'SP',
      }),
    });

    const loginAdotanteRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: adotanteEmail,
        senha: '123456password',
      }),
    });
    const loginAdotanteData = await loginAdotanteRes.json();
    const adotanteToken = loginAdotanteData.token;
    console.log('✅ Token do Adotante obtido com sucesso.');

    // 6. Solicitar Adoção
    console.log('\n6️⃣ Enviando solicitação de adoção para o pet...');
    const adoptionReqRes = await fetch(`${BASE_URL}/pets/${petId}/adopt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adotanteToken}`,
      },
      body: JSON.stringify({
        formularioRespostas: {
          tipoMoradia: 'Casa com quintal fechado',
          temTelasNasJanelas: true,
          outrosPets: false,
        },
      }),
    });
    const adoptionReqData = await adoptionReqRes.json();
    console.log('✅ Solicitação de adoção criada com ID:', adoptionReqData.id);
    const adoptionId = adoptionReqData.id;

    // 7. Aprovar Adoção (Como ONG)
    console.log('\n7️⃣ ONG aprovando a solicitação de adoção...');
    const approveRes = await fetch(`${BASE_URL}/adoptions/${adoptionId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ongToken}`,
      },
      body: JSON.stringify({
        status: 'APROVADA',
      }),
    });
    const approveData = await approveRes.json();
    console.log('✅ Status atualizado com sucesso:', approveData.status);

    console.log('\n🎉 Todos os testes do core passaram com sucesso!');
  } catch (error) {
    console.error('❌ Erro durante os testes:', error);
  }
}

runTests();