export const ResponseHandler = (response: any) => {
    return {
           ...response.data,
            apiData: response.data,
            status: response.status === 200,
            error: response.status !== 200
    }
}