import ballerina/http;
import ballerina/jwt;
import ballerina/lang.array;
import ballerina/test;

// Throwaway RSA keypair + self-signed certificate committed under
// tests/resources — generated once with openssl, used by nothing but this
// suite. GATEWAY_ASSERTION_CERTIFICATE/_ISSUER/_HEADER are exported (see the
// `ballerina` skill) BEFORE `bal test` starts, pointing at
// tests/resources/primary_cert.pem with issuer "test-gateway" and header
// "x-jwt-assertion" — so the interceptor verifies against this keypair with
// no gateway or IdP involved.
const string PRIMARY_KEY_FILE = "tests/resources/primary_key.pem";
const string OTHER_KEY_FILE = "tests/resources/other_key.pem";
const string TEST_ISSUER = "test-gateway";
const string TEST_HEADER = "x-jwt-assertion";

final http:Client testClient = check new ("http://localhost:9090");

function mintAssertion(string keyFile, string subject, string scope) returns string|error {
    jwt:IssuerConfig config = {
        issuer: TEST_ISSUER,
        username: subject,
        expTime: 300,
        customClaims: {"scope": scope, "username": subject, "ouHandle": "test-org"},
        signatureConfig: {
            config: {keyFile: keyFile}
        }
    };
    return jwt:issue(config);
}

function base64UrlDecode(string segment) returns byte[]|error {
    string padded = segment;
    int remainder = padded.length() % 4;
    if remainder == 2 {
        padded = padded + "==";
    } else if remainder == 3 {
        padded = padded + "=";
    }
    string standard = re `-`.replaceAll(padded, "+");
    standard = re `_`.replaceAll(standard, "/");
    return array:fromBase64(standard);
}

function base64UrlEncode(byte[] data) returns string {
    string standard = array:toBase64(data);
    string noPad = re `=+$`.replaceAll(standard, "");
    string urlSafe = re `\+`.replaceAll(noPad, "-");
    return re `/`.replaceAll(urlSafe, "_");
}

// Flips one byte of the payload segment so the signature no longer matches —
// a tampered token, never downgraded to anonymous.
function tamperedToken(string token) returns string|error {
    string[] parts = re `\.`.split(token);
    if parts.length() != 3 {
        return error("not a compact JWS");
    }
    byte[] payloadBytes = check base64UrlDecode(parts[1]);
    string payloadText = check string:fromBytes(payloadBytes);
    string edited = re `"test-cook-1"`.replace(payloadText, "\"someone-else\"");
    string reencoded = base64UrlEncode(edited.toBytes());
    return parts[0] + "." + reencoded + "." + parts[2];
}

@test:Config {}
function validAssertionIsNotRejected() returns error? {
    string token = check mintAssertion(PRIMARY_KEY_FILE, "test-cook-1", "recipes:read recipes:create");
    http:Response response = check testClient->get("/me/recipes", {[TEST_HEADER]: token});
    // No reachable recipe-db in this sandbox, so the handler itself may 500 —
    // what this test asserts is that the GATEWAY ASSERTION layer accepted a
    // validly-signed caller: it must never answer 401.
    test:assertNotEquals(response.statusCode, 401, "a validly-signed assertion must not be rejected");
}

@test:Config {}
function wrongKeySignatureIsRejected() returns error? {
    string token = check mintAssertion(OTHER_KEY_FILE, "test-cook-1", "recipes:read");
    http:Response response = check testClient->get("/me/recipes", {[TEST_HEADER]: token});
    test:assertEquals(response.statusCode, 401, "an assertion signed by a different key must be rejected");
}

@test:Config {}
function tamperedPayloadIsRejected() returns error? {
    string token = check mintAssertion(PRIMARY_KEY_FILE, "test-cook-1", "recipes:read");
    string tampered = check tamperedToken(token);
    http:Response response = check testClient->get("/me/recipes", {[TEST_HEADER]: tampered});
    test:assertEquals(response.statusCode, 401, "a tampered assertion must be rejected, never read as anonymous");
}

@test:Config {}
function noAssertionIsRejectedOnAProtectedPath() returns error? {
    // Every operation in openapi.yaml sits under /me/... with a scoped
    // security block — there is no `security: []` operation on this
    // service, so there is no public case to exercise. A request with no
    // assertion at all on a protected path must be a 401, never served as
    // anonymous.
    http:Response response = check testClient->get("/me/recipes");
    test:assertEquals(response.statusCode, 401, "a protected path with no assertion must be rejected");
}
