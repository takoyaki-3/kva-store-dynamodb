import axios from 'axios';
import exp from 'constants';

require('dotenv').config();

const apiUrl = process.env.API_URL;
const secretToken = process.env.AUTHENTICATED_USER_SECRET_TOKEN;
const adminSecretToken = process.env.ADMIN_USER_SECRET_TOKEN;

describe('Get, Add, Delete by anonymous', () => {

  beforeEach(async () => {
    const response = await axios.get(`${apiUrl}?key=testKey`);
    expect(response.status).toBe(200);

    const items = response.data;

    items.forEach(async (item) => {
      const resp = await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${adminSecretToken}` }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('An empty array should be returned when a GET request is made in an empty state.', async () => {

    const response = await axios.get(`${apiUrl}?key=testKey&limit=100`);
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(0);
  });

  it('Data should be returned when making a GET request after adding data', async () => {
    // Add data
    await axios.post(apiUrl, { key: 'testKey', data: 'testData' });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get added data
    const response = await axios.get(`${apiUrl}?key=testKey&limit=10`);
    expect(response.status).toBe(200);
    expect(response.data).toEqual(expect.arrayContaining([expect.objectContaining({ data: 'testData', readable: '*', owner: 'anonymous' })]));
  });

  it('If you delete data while it exists, the data in the DB should be deleted.', async () => {
    // Add data
    await axios.post(apiUrl, { key: 'testKey', data: 'testData' });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Delete the data
    const response = await axios.get(`${apiUrl}?key=testKey`);
    const items = response.data;
    items.forEach(async (item) => {
      const resp = await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${adminSecretToken}` }
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get the data after deleting it
    const afterResponse = await axios.get(`${apiUrl}?key=testKey`);
    expect(afterResponse.status).toBe(200);
    expect(Array.isArray(afterResponse.data)).toBe(true);
    expect(afterResponse.data.length).toBe(0);
  });
});

describe('Get, Add, Delete by authenticated user', () => {
  beforeEach(async () => {
    const response = await axios.get(`${apiUrl}?key=authTestKey`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(response.status).toBe(200);

    const items = response.data;

    for (const item of items) {
      await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${secretToken}` }
      });
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  it('An empty array should be returned when a GET request is made by an authenticated user in an empty state.', async () => {
    const response = await axios.get(`${apiUrl}?key=authTestKey&limit=100`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(response.status).toBe(200);
    expect(Array.isArray(response.data)).toBe(true);
    expect(response.data.length).toBe(0);
  });

  it('Data should be returned when making a GET request after an authenticated user adds data', async () => {
    await axios.post(apiUrl, { key: 'authTestKey', data: 'authTestData' }, {
      headers: { SecretToken: `${secretToken}` }
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await axios.get(`${apiUrl}?key=authTestKey`, {
      headers: { SecretToken: `${secretToken}` }
    });
    const itme = response.data[0]
    expect(response.status).toBe(200);
    expect(itme.data).toBe('authTestData');
    expect(itme.readable).toBe('*');
    expect(itme.owner).toBe('testUser');
  });

  it('If an authenticated user deletes data while it exists, the data in the DB should be deleted.', async () => {
    await axios.post(apiUrl, { key: 'authTestKey', data: 'authTestData' }, {
      headers: { SecretToken: `${secretToken}` }
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const response = await axios.get(`${apiUrl}?key=authTestKey`, {
      headers: { SecretToken: `${secretToken}` }
    });
    const items = response.data;
    for (const item of items) {
      await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${secretToken}` }
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const afterResponse = await axios.get(`${apiUrl}?key=authTestKey&limit=10`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(afterResponse.status).toBe(200);
    expect(Array.isArray(afterResponse.data)).toBe(true);
    expect(afterResponse.data.length).toBe(0);
  });
});

describe('Readable field behavior', () => {
  const testKeyForReadable = 'testKeyReadable';
  const testDataForReadable = 'testDataReadable';

  it('Data added by an anonymous user should not be accessible by another user when readable is set to private', async () => {
    // Add data by an anonymous user
    await axios.post(apiUrl, { key: testKeyForReadable, data: testDataForReadable, readable: 'private' });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // authenticated user tries to get data
    const response = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(response.data.length).toBe(0);

    // Get data as an admin user
    const adminResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(adminResponse.data).toEqual(expect.arrayContaining([expect.objectContaining({ data: testDataForReadable })]));
  
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Delete data by an anonymous user
    let cleanupResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`);
    let items = cleanupResponse.data;
    for (const item of items) {
      try {
        const res = await axios.delete(apiUrl, {
          data: { key: item.key, created: item.created }
        });
        expect(res.status).toBe(401);  
      } catch (error) {
        expect(error.response.status).toBe(401);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get data as an admin user
    let authenticatedGetResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(authenticatedGetResponse.data.length).toBe(1);

    // Delete data by an authenticated user
    for (const item of items) {
      try {
        const res = await axios.delete(apiUrl, {
          data: { key: item.key, created: item.created },
          headers: { SecretToken: `${secretToken}` }
        });
        expect(res.status).toBe(403);
      } catch (error) {
        expect(error.response.status).toBe(403);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get data as an admin user
    let adminGetResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(adminGetResponse.data.length).toBe(1);
    items = adminGetResponse.data;
    
    // Delete data by an admin user
    for (const item of items) {
      await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${adminSecretToken}` }
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get data as an admin user
    adminGetResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(adminGetResponse.data.length).toBe(0);
  }, 100000);

  it('Data added by an authenticated user should be accessible only when readable matches the condition', async () => {
    // Add data as an authenticated user
    await axios.post(apiUrl, { key: testKeyForReadable, data: testDataForReadable, readable: 'authenticated' }, {
      headers: { SecretToken: `${secretToken}` }
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Anonymous user tries to get data
    const anonResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`);
    expect(anonResponse.data.length).toBe(0);

    // Get data as an authenticated user
    const authResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${secretToken}` }
    });
    expect(authResponse.data).toEqual(expect.arrayContaining([expect.objectContaining({ data: testDataForReadable })]));

    // Get data as an admin user
    const adminResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(adminResponse.data).toEqual(expect.arrayContaining([expect.objectContaining({ data: testDataForReadable })]));
  });
  
  // Clear data after each test
  afterEach(async () => {
    // Delete data by an admin user
    const cleanupResponse = await axios.get(`${apiUrl}?key=${testKeyForReadable}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    const items = cleanupResponse.data;
    for (const item of items) {
      await axios.delete(apiUrl, {
        data: { key: item.key, created: item.created },
        headers: { SecretToken: `${adminSecretToken}` }
      });
    }
  });
});

describe('private key behavior', () => {
  it('Data added by an authenticated user should be accessible only when the private key matches the condition', async () => {
    const testKeyForPrivate = 'privateKey-adminTest@kva-store.api.takoyaki3.com';
    // Add data as an authenticated user
    const resp = await axios.post(apiUrl, { key: testKeyForPrivate, data: 'testDataForPrivate', readable: 'adminTest@kva-store.api.takoyaki3.com' }, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(resp.status).toBe(200);
  });
  it('Only xxx user can be add "privateKey-xxx"', async () => {
    const testKeyForPrivate = 'privateKey-adminTest@kva-store.api.takoyaki3.com';
    // Add data as an authenticated user
    try {
      const response = await axios.post(apiUrl, { key: testKeyForPrivate, data: 'testDataForPrivate', readable: 'adminTest@kva-store.api.takoyaki3.com' }, {
        headers: { SecretToken: `${secretToken}` }
      });
      expect(response.status).toBe(403);
    } catch (error) {
      expect(error.response.status).toBe(403);
    }
  });
});

describe('set start and end', () => {
  it('start and end', async () => {
    const testKey = 'testKeyForStartAndEnd';

    // Get added data
    const response = await axios.get(`${apiUrl}?key=${testKey}&start=2024-01-02&end=2024-01-04`);
    expect(response.status).toBe(200);
    expect(response.data.length).toEqual(2);
    expect(response.data[0].created).toBe('2024-01-03T00:00:00.000Z');
    expect(response.data[1].created).toBe('2024-01-02T00:00:00.000Z');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
  it('start only', async () => {
    const testKey = 'testKeyForStartAndEnd';

    // Get added data
    const response = await axios.get(`${apiUrl}?key=${testKey}&start=2024-01-02`);
    expect(response.status).toBe(200);
    expect(response.data.length).toEqual(3);
    expect(response.data[0].created).toBe('2024-01-04T00:00:00.000Z');
    expect(response.data[1].created).toBe('2024-01-03T00:00:00.000Z');
    expect(response.data[2].created).toBe('2024-01-02T00:00:00.000Z');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
  it('end only', async () => {
    const testKey = 'testKeyForStartAndEnd';

    // Get added data
    const response = await axios.get(`${apiUrl}?key=${testKey}&end=2024-01-04`);
    expect(response.status).toBe(200);
    expect(response.data.length).toEqual(3);
    expect(response.data[0].created).toBe('2024-01-03T00:00:00.000Z');
    expect(response.data[1].created).toBe('2024-01-02T00:00:00.000Z');
    expect(response.data[2].created).toBe('2024-01-01T00:00:00.000Z');
  });
});

describe('authentication', () => {
  it('Authentication GET', async () => {
    const resp = await axios.get(`${apiUrl}/auth`, { headers: { SecretToken: `${secretToken}` } });
    expect(resp.status).toBe(200);
  });
  it('Authentication POST', async () => {
    const resp = await axios.post(`${apiUrl}/auth`, {}, { headers: { SecretToken: `${secretToken}` } });
    expect(resp.status).toBe(200);
  });
  it('Authentication DELETE', async () => {
    const resp = await axios.delete(`${apiUrl}/auth`, { headers: { SecretToken: `${adminSecretToken}` } });
    expect(resp.status).toBe(200);
  });
  it('Authentication error', async () => {
    try {
      const resp = await axios.delete(`${apiUrl}/auth`, { headers: { SecretToken: `${secretToken}error` } });
      expect(resp.status).toBe(401);
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
  });
});

describe('set id', () => {
  it('add with id', async () => {
    const testKey = 'testKeyForId';
    const testId = 'testId';

    // First, delete the data if it exists
    try {
      await axios.delete(`${apiUrl}`, { data: { key: testKey, id: testId }, headers: { SecretToken: `${adminSecretToken}` } });
    } catch (error) {
    }

    // Add data
    const respPost = await axios.post(`${apiUrl}`, {key: testKey, id: testId, data: 'testData'});
    expect(respPost.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get added data
    const respGet = await axios.get(`${apiUrl}?key=${testKey}&id=${testId}`);
    expect(respGet.status).toBe(200);
    expect(respGet.data.length).toEqual(1);
    expect(respGet.data[0].data).toBe('testData');

    // Update the data
    const respUpdate = await axios.post(`${apiUrl}`,
      {key: testKey, id: testId, data: 'testData2'},
      {headers: { SecretToken: `${adminSecretToken}`}
    });
    expect(respUpdate.status).toBe(200);

    // Get updated data
    await new Promise((resolve) => setTimeout(resolve, 500));
    const respGet2 = await axios.get(`${apiUrl}?key=${testKey}&id=${testId}`, {
      headers: { SecretToken: `${adminSecretToken}` }
    });
    expect(respGet2.status).toBe(200);
    expect(respGet2.data.length).toEqual(1);
    expect(respGet2.data[0].data).toBe('testData2');

    // ok
    // Get updated data
    const respGet3 = await axios.get(`${apiUrl}?key=${testKey}&id=${testId}`);
    expect(respGet3.status).toBe(200);

    // Other user can't update
    try {
      const respAnonymousUpdate = await axios.post(`${apiUrl}`,
        {key: testKey, id: testId, data: 'testData3'},
      );
      expect(respAnonymousUpdate.status).toBe(403);
    } catch (error) {
      expect(error.response.status).toBe(403);
    }

    // Only owner or admin can delete
    try {
      const respAnonymousDelete = await axios.delete(`${apiUrl}`, { data: { key: testKey, id: testId } });
      expect(respAnonymousDelete.status).toBe(401);        
    } catch (error) {
      expect(error.response.status).toBe(401);
    }
    try {
      const respAuthenticatedDelete = await axios.delete(`${apiUrl}`, { data: { key: testKey, id: testId }, headers: { SecretToken: `${secretToken}` } });
      expect(respAuthenticatedDelete.status).toBe(403);
    } catch (error) {
      expect(error.response.data.message).toBe('Forbidden: You can only delete your own items.')
      expect(error.response.status).toBe(403);
    }

    // Delete the data
    const respDelete = await axios.delete(`${apiUrl}`, { data: { key: testKey, id: testId }, headers: { SecretToken: `${adminSecretToken}` } });
    expect(respDelete.status).toBe(200);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Get the data after deleting it
    const afterResponse = await axios.get(`${apiUrl}?key=${testKey}&id=${testId}`);
    expect(afterResponse.status).toBe(200);
    expect(afterResponse.data.length).toBe(0);
  });
});
