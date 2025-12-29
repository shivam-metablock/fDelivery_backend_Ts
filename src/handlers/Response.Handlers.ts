export const ResponseHandler = (response: any) => {
    
    
    const extraField =  response.status === 200&& response.data.status?{}:{message:response.data.response}
    return {
           ...response.data,
            apiData: response.data,
            status: response.status === 200&& response.data.status,
            error: response.status !== 200,
            ...extraField
    }
}