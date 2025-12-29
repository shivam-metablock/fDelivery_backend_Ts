export const ResponseHandler = (response: any) => {


    return {
        ...response.data,
        apiData: response.data,
        status: response.status === 200 && response.data.status,
        error: response.status !== 200,

    }
}

export const ApiResponseHandler = (response: any, text: string) => {

    console.log("error in the ", text);

    return { status: false, error: true, message: response.message || response.apiData.response || text };

}